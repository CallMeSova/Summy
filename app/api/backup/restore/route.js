import JSZip from "jszip";
import { run, tx } from "@/lib/db";
import { handler, ok, ApiError, str } from "@/lib/api";
import { isPdf, safeStoredName, MAX_PDF_BYTES } from "@/lib/files";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

const MAX_BACKUP = 100 * 1024 * 1024; // 100 MB max upload

export const POST = handler(async (req) => {
  const user = await requireUser();
  const uid = user.id;

  const fd = await req.formData();
  const file = fd.get("file");
  if (!file || typeof file === "string") throw new ApiError(400, "Backup file is required");
  if (file.size > MAX_BACKUP) throw new ApiError(413, "Backup is too large (max 100 MB)");

  let zip;
  try {
    zip = await JSZip.loadAsync(Buffer.from(await file.arrayBuffer()));
  } catch {
    throw new ApiError(400, "Not a valid ZIP file");
  }

  const manifestFile = zip.file("manifest.json");
  const libraryFile = zip.file("library.json");
  if (!manifestFile || !libraryFile) {
    throw new ApiError(400, "Invalid Summy backup archive");
  }

  let manifest, libData;
  try {
    manifest = JSON.parse(await manifestFile.async("string"));
    libData = JSON.parse(await libraryFile.async("string"));
  } catch {
    throw new ApiError(400, "Corrupt backup JSON");
  }
  if (manifest?.app !== "summy" || !Array.isArray(libData?.subjects)) {
    throw new ApiError(400, "Not a valid Summy backup");
  }

  // Pre-load and validate any PDF blobs before modifying the user's library
  const pdfBlobs = new Map();
  for (const att of libData.attachments || []) {
    if (!att?.zip_path || typeof att.zip_path !== "string" || !att.zip_path.startsWith("uploads/")) continue;
    const entry = zip.file(att.zip_path);
    if (!entry) continue;
    const buf = await entry.async("nodebuffer");
    if (buf.length > MAX_PDF_BYTES || !isPdf(buf)) {
      throw new ApiError(400, "Backup contains an invalid PDF attachment");
    }
    pdfBlobs.set(att.zip_path, buf);
  }

  await tx(async () => {
    // Clear only this user's existing subjects (cascades to courses, lessons, attachments) & progress/bookmarks
    await run("DELETE FROM bookmarks WHERE user_id=?", uid);
    await run("DELETE FROM reading_progress WHERE user_id=?", uid);
    await run("DELETE FROM reading_history WHERE user_id=?", uid);
    await run("DELETE FROM subjects WHERE user_id=?", uid);

    const subjectIdMap = new Map();
    const courseIdMap = new Map();
    const lessonIdMap = new Map();

    for (const s of (libData.subjects || []).slice(0, 500)) {
      const name = str(s.name, { field: "subject.name", required: true, max: 120 });
      const description = str(s.description, { max: 500 });
      const color = /^#[0-9a-fA-F]{6}$/.test(s.color || "") ? s.color : "#0070F3";
      const r = await run(
        "INSERT INTO subjects (user_id, name, description, color, position) VALUES (?,?,?,?,?)",
        uid,
        name,
        description,
        color,
        Number(s.position) || 0
      );
      subjectIdMap.set(Number(s.id), Number(r.lastInsertRowid));
    }

    for (const c of (libData.courses || []).slice(0, 2000)) {
      const newSubjId = subjectIdMap.get(Number(c.subject_id));
      if (!newSubjId) continue;
      const title = str(c.title, { field: "course.title", required: true, max: 160 });
      const description = str(c.description, { max: 1000 });
      const r = await run(
        "INSERT INTO courses (subject_id, title, description, position) VALUES (?,?,?,?)",
        newSubjId,
        title,
        description,
        Number(c.position) || 0
      );
      courseIdMap.set(Number(c.id), Number(r.lastInsertRowid));
    }

    for (const l of (libData.lessons || []).slice(0, 5000)) {
      const newCourseId = courseIdMap.get(Number(l.course_id));
      if (!newCourseId) continue;
      if (!["richtext", "markdown", "pdf"].includes(l.content_type)) continue;
      const title = str(l.title, { field: "lesson.title", required: true, max: 200 });
      const description = str(l.description, { max: 1000 });
      const tags = str(l.tags, { max: 300 });
      const r = await run(
        `INSERT INTO lessons (course_id, title, description, content_type, content_json, content_md, content_text, tags, position)
         VALUES (?,?,?,?,?,?,?,?,?)`,
        newCourseId,
        title,
        description,
        l.content_type,
        l.content_json ? String(l.content_json) : null,
        l.content_md ? String(l.content_md) : null,
        String(l.content_text || ""),
        tags,
        Number(l.position) || 0
      );
      lessonIdMap.set(Number(l.id), Number(r.lastInsertRowid));
    }

    for (const att of libData.attachments || []) {
      const newLessonId = lessonIdMap.get(Number(att.lesson_id));
      const buf = pdfBlobs.get(att.zip_path);
      if (!newLessonId || !buf) continue;
      await run(
        "INSERT INTO attachments (lesson_id, original_name, stored_name, mime, size, data) VALUES (?,?,?,?,?,?)",
        newLessonId,
        String(att.original_name || "document.pdf").slice(0, 255),
        safeStoredName(".pdf"),
        "application/pdf",
        buf.length,
        buf
      );
    }

    for (const bm of libData.bookmarks || []) {
      const newLessonId = lessonIdMap.get(Number(bm.lesson_id));
      if (!newLessonId) continue;
      await run("INSERT OR IGNORE INTO bookmarks (user_id, lesson_id) VALUES (?,?)", uid, newLessonId);
    }

    for (const rp of libData.reading_progress || []) {
      const newLessonId = lessonIdMap.get(Number(rp.lesson_id));
      if (!newLessonId) continue;
      await run(
        "INSERT OR IGNORE INTO reading_progress (user_id, lesson_id, progress, completed) VALUES (?,?,?,?)",
        uid,
        newLessonId,
        Math.max(0, Math.min(100, Number(rp.progress) || 0)),
        rp.completed ? 1 : 0
      );
    }
  });

  return ok({ ok: true });
});
