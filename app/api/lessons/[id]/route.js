import fs from "node:fs";
import { get, run, batch } from "@/lib/db";
import { handler, ok, intId, ApiError } from "@/lib/api";
import { lessonCardSql, bool } from "@/lib/repo";
import { readLessonInput, validatePdf, updateLesson } from "@/lib/lessons";
import { uploadPath } from "@/lib/files";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export const GET = handler(async (_req, { params }) => {
  const user = await requireUser();
  const id = intId((await params).id);

  const [cardRows, fullRows, attachmentRows, siblingRows] = await batch([
    [`${lessonCardSql()} WHERE l.id=? AND s.user_id=?`, id, user.id],
    ["SELECT content_json, content_md FROM lessons WHERE id=?", id],
    [
      "SELECT id, original_name, size, mime, stored_name, (data IS NOT NULL) AS has_blob FROM attachments WHERE lesson_id=? ORDER BY id DESC LIMIT 1",
      id,
    ],
    [
      `SELECT l.id, l.title FROM lessons l
       JOIN courses c ON c.id=l.course_id
       JOIN subjects s ON s.id=c.subject_id
       WHERE l.course_id=(SELECT course_id FROM lessons WHERE id=?) AND s.user_id=?
       ORDER BY l.position, l.id`,
      id,
      user.id,
    ],
  ]);

  const card = cardRows[0];
  if (!card) throw new ApiError(404, "Lesson not found");
  const full = fullRows[0] || {};
  const attachment = attachmentRows[0] || null;
  const siblings = siblingRows;
  const idx = siblings.findIndex((s) => Number(s.id) === id);
  let fileExists = false;
  if (attachment) {
    fileExists = Boolean(attachment.has_blob) || (attachment.stored_name && fs.existsSync(uploadPath(attachment.stored_name)));
  }
  return ok({
    ...bool(card),
    ...full,
    attachment: attachment
      ? {
          id: attachment.id,
          original_name: attachment.original_name,
          size: attachment.size,
          mime: attachment.mime,
          exists: fileExists,
        }
      : null,
    prev: idx > 0 ? siblings[idx - 1] : null,
    next: idx >= 0 && idx < siblings.length - 1 ? siblings[idx + 1] : null,
    index: idx + 1,
    total: siblings.length,
  });
});

export const PATCH = handler(async (req, { params }) => {
  const user = await requireUser();
  const id = intId((await params).id);
  const cur = await get(
    `SELECT l.* FROM lessons l
     JOIN courses c ON c.id=l.course_id
     JOIN subjects s ON s.id=c.subject_id
     WHERE l.id=? AND s.user_id=?`,
    id,
    user.id
  );
  if (!cur) throw new ApiError(404, "Lesson not found");
  const { raw, file } = await readLessonInput(req);
  const pdfBuf = file ? await validatePdf(file) : null;
  await updateLesson(user.id, id, cur, raw, pdfBuf, file);
  return ok({ id });
});

export const DELETE = handler(async (_req, { params }) => {
  const user = await requireUser();
  const id = intId((await params).id);
  const cur = await get(
    `SELECT l.id FROM lessons l
     JOIN courses c ON c.id=l.course_id
     JOIN subjects s ON s.id=c.subject_id
     WHERE l.id=? AND s.user_id=?`,
    id,
    user.id
  );
  if (!cur) throw new ApiError(404, "Lesson not found");
  await run("DELETE FROM lessons WHERE id=?", id);
  return ok({ ok: true });
});
