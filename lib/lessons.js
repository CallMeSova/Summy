import "server-only";
import { get, run, tx } from "@/lib/db";
import { ApiError, str, intId } from "@/lib/api";
import { MAX_PDF_BYTES, safeStoredName, isPdf } from "@/lib/files";
import { nextPosition } from "@/lib/repo";

const TYPES = ["richtext", "markdown", "pdf"];
const MAX_TEXT = 5_000_000;

/** Parse JSON or multipart request into a normalized lesson payload. */
export async function readLessonInput(req) {
  const ct = req.headers.get("content-type") || "";
  let raw = {};
  let file = null;
  if (ct.includes("multipart/form-data")) {
    const fd = await req.formData();
    for (const [k, v] of fd.entries()) {
      if (k === "file" && typeof v !== "string") file = v;
      else raw[k] = v;
    }
  } else {
    try {
      raw = await req.json();
    } catch {
      throw new ApiError(400, "Invalid JSON body");
    }
  }
  return { raw, file };
}

export async function validatePdf(file) {
  if (!file) throw new ApiError(400, "PDF file is required");
  if (file.size > MAX_PDF_BYTES) throw new ApiError(413, "PDF is too large (max 20 MB)");
  const name = (file.name || "").toLowerCase();
  if (!name.endsWith(".pdf")) throw new ApiError(400, "Only .pdf files are allowed");
  if (file.type && file.type !== "application/pdf") throw new ApiError(400, "Invalid file type");
  const buf = Buffer.from(await file.arrayBuffer());
  if (!isPdf(buf)) throw new ApiError(400, "File is not a valid PDF");
  return buf;
}

export async function createLesson(userId, raw, pdfBuf, file) {
  const courseId = intId(raw.course_id, "course_id");
  const ownedCourse = await get(
    "SELECT c.id FROM courses c JOIN subjects s ON s.id=c.subject_id WHERE c.id=? AND s.user_id=?",
    courseId,
    userId
  );
  if (!ownedCourse) throw new ApiError(404, "Course not found");

  const title = str(raw.title, { field: "title", required: true, max: 200 });
  const description = str(raw.description, { max: 1000 });
  const tags = str(raw.tags, { max: 300 });
  const type = String(raw.content_type);
  if (!TYPES.includes(type)) throw new ApiError(400, "Invalid content_type");

  let json = null, md = null, text = "", hasQuiz = 0;
  if (type === "richtext") {
    json = typeof raw.content_json === "string" ? raw.content_json : JSON.stringify(raw.content_json || {});
    text = String(raw.content_text || "").slice(0, MAX_TEXT);
  } else if (type === "markdown") {
    md = String(raw.content_md || "");
    if (!md.trim()) throw new ApiError(400, "Markdown content is empty");
    if (md.length > MAX_TEXT) throw new ApiError(413, "Markdown is too large");
    text = md;
    hasQuiz = /```(?:summy-quiz|quiz)/i.test(md) ? 1 : 0;
  }

  const stored = type === "pdf" ? safeStoredName(".pdf") : null;
  const pos = await nextPosition("lessons", "course_id", courseId);

  return await tx(async () => {
    const r = await run(
      `INSERT INTO lessons (course_id,title,description,content_type,content_json,content_md,content_text,tags,has_quiz,position)
       VALUES (?,?,?,?,?,?,?,?,?,?)`,
      courseId, title, description, type, json, md, text, tags, hasQuiz, pos
    );
    const id = Number(r.lastInsertRowid);
    if (stored && pdfBuf) {
      await run(
        "INSERT INTO attachments (lesson_id, original_name, stored_name, mime, size, data) VALUES (?,?,?,?,?,?)",
        id,
        String(file.name || "document.pdf").slice(0, 255),
        stored,
        "application/pdf",
        pdfBuf.length,
        pdfBuf
      );
    }
    return id;
  });
}

export async function updateLesson(userId, id, cur, raw, pdfBuf, file) {
  const title = raw.title !== undefined ? str(raw.title, { field: "title", required: true, max: 200 }) : cur.title;
  const description = raw.description !== undefined ? str(raw.description, { max: 1000 }) : cur.description;
  const tags = raw.tags !== undefined ? str(raw.tags, { max: 300 }) : cur.tags;
  let courseId = cur.course_id;
  let position = cur.position;
  if (raw.course_id !== undefined && Number(raw.course_id) !== cur.course_id) {
    courseId = intId(raw.course_id, "course_id");
    const ownedCourse = await get(
      "SELECT c.id FROM courses c JOIN subjects s ON s.id=c.subject_id WHERE c.id=? AND s.user_id=?",
      courseId,
      userId
    );
    if (!ownedCourse) throw new ApiError(404, "Course not found");
    position = await nextPosition("lessons", "course_id", courseId);
  }
  let json = cur.content_json, md = cur.content_md, text = cur.content_text, hasQuiz = Number(cur.has_quiz || 0);
  if (cur.content_type === "richtext" && raw.content_json !== undefined) {
    json = typeof raw.content_json === "string" ? raw.content_json : JSON.stringify(raw.content_json);
    text = String(raw.content_text || "").slice(0, MAX_TEXT);
  }
  if (cur.content_type === "markdown" && raw.content_md !== undefined) {
    md = String(raw.content_md);
    if (!md.trim()) throw new ApiError(400, "Markdown content is empty");
    if (md.length > MAX_TEXT) throw new ApiError(413, "Markdown is too large");
    text = md;
    hasQuiz = /```(?:summy-quiz|quiz)/i.test(md) ? 1 : 0;
  }
  const stored = cur.content_type === "pdf" && pdfBuf ? safeStoredName(".pdf") : null;
  await tx(async () => {
    await run(
      `UPDATE lessons SET title=?,description=?,tags=?,course_id=?,position=?,content_json=?,content_md=?,content_text=?,has_quiz=?,
       updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id=?`,
      title, description, tags, courseId, position, json, md, text, hasQuiz, id
    );
    if (stored && pdfBuf) {
      await run("DELETE FROM attachments WHERE lesson_id=?", id);
      await run(
        "INSERT INTO attachments (lesson_id, original_name, stored_name, mime, size, data) VALUES (?,?,?,?,?,?)",
        id,
        String(file.name || "document.pdf").slice(0, 255),
        stored,
        "application/pdf",
        pdfBuf.length,
        pdfBuf
      );
    }
  });
}
