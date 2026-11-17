import fs from "node:fs";
import JSZip from "jszip";
import { all } from "@/lib/db";
import { handler } from "@/lib/api";
import { uploadPath } from "@/lib/files";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export const GET = handler(async () => {
  const user = await requireUser();
  const uid = user.id;

  const subjects = await all("SELECT * FROM subjects WHERE user_id=? ORDER BY position, id", uid);
  const courses = await all(
    `SELECT c.* FROM courses c JOIN subjects s ON s.id=c.subject_id WHERE s.user_id=? ORDER BY c.position, c.id`,
    uid
  );
  const lessons = await all(
    `SELECT l.* FROM lessons l JOIN courses c ON c.id=l.course_id JOIN subjects s ON s.id=c.subject_id
     WHERE s.user_id=? ORDER BY l.position, l.id`,
    uid
  );
  const bookmarks = await all("SELECT * FROM bookmarks WHERE user_id=?", uid);
  const reading_progress = await all("SELECT * FROM reading_progress WHERE user_id=?", uid);
  const settings = await all("SELECT key, value FROM user_settings WHERE user_id=?", uid);
  const attachments = await all(
    `SELECT a.* FROM attachments a
     JOIN lessons l ON l.id=a.lesson_id
     JOIN courses c ON c.id=l.course_id
     JOIN subjects s ON s.id=c.subject_id
     WHERE s.user_id=?`,
    uid
  );

  const zip = new JSZip();
  const attachmentMeta = [];

  for (const a of attachments) {
    const fileName = `uploads/${a.id}-${a.stored_name || "document.pdf"}`;
    let buf = null;
    if (a.data) {
      buf = Buffer.from(a.data);
    } else if (a.stored_name) {
      const p = uploadPath(a.stored_name);
      if (fs.existsSync(p)) buf = fs.readFileSync(p);
    }
    if (buf) {
      zip.file(fileName, buf);
      attachmentMeta.push({
        lesson_id: a.lesson_id,
        original_name: a.original_name,
        stored_name: a.stored_name,
        mime: a.mime,
        size: buf.length,
        zip_path: fileName,
      });
    }
  }

  zip.file(
    "manifest.json",
    JSON.stringify({
      app: "summy",
      version: 2,
      created_at: new Date().toISOString(),
    })
  );
  zip.file(
    "library.json",
    JSON.stringify({
      subjects,
      courses,
      lessons,
      bookmarks,
      reading_progress,
      settings,
      attachments: attachmentMeta,
    })
  );

  const buf = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
  return new Response(buf, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="summy-backup-${stamp}.zip"`,
      "X-Content-Type-Options": "nosniff",
    },
  });
});
