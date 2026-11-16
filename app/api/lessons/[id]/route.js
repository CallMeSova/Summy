import { all, get, run } from "@/lib/db";
import { handler, ok, intId, ApiError } from "@/lib/api";
import { LESSON_CARD, bool } from "@/lib/repo";
import { readLessonInput, validatePdf, updateLesson } from "@/lib/lessons";
import { removeLessonFiles } from "@/lib/files";

export const dynamic = "force-dynamic";

export const GET = handler(async (_req, { params }) => {
  const id = intId((await params).id);
  const card = get(`${LESSON_CARD} WHERE l.id=?`, id);
  if (!card) throw new ApiError(404, "Lesson not found");
  const full = get("SELECT content_json, content_md FROM lessons WHERE id=?", id);
  const attachment = get(
    "SELECT id, original_name, size, mime, stored_name FROM attachments WHERE lesson_id=? ORDER BY id DESC LIMIT 1", id
  );
  const siblings = all("SELECT id, title FROM lessons WHERE course_id=? ORDER BY position, id", card.course_id);
  const idx = siblings.findIndex((s) => s.id === id);
  let file_exists = null;
  if (attachment) {
    const { existsSync } = await import("node:fs");
    const { uploadPath } = await import("@/lib/files");
    file_exists = existsSync(uploadPath(attachment.stored_name));
    delete attachment.stored_name;
  }
  return ok({
    ...bool(card),
    ...full,
    attachment: attachment ? { ...attachment, exists: file_exists } : null,
    prev: idx > 0 ? siblings[idx - 1] : null,
    next: idx >= 0 && idx < siblings.length - 1 ? siblings[idx + 1] : null,
    index: idx + 1,
    total: siblings.length,
  });
});

export const PATCH = handler(async (req, { params }) => {
  const id = intId((await params).id);
  const cur = get("SELECT * FROM lessons WHERE id=?", id);
  if (!cur) throw new ApiError(404, "Lesson not found");
  const { raw, file } = await readLessonInput(req);
  const pdfBuf = file ? await validatePdf(file) : null;
  updateLesson(id, cur, raw, pdfBuf, file);
  return ok({ id });
});

export const DELETE = handler(async (_req, { params }) => {
  const id = intId((await params).id);
  const files = all("SELECT stored_name FROM attachments WHERE lesson_id=?", id);
  run("DELETE FROM lessons WHERE id=?", id);
  removeLessonFiles(files);
  return ok({ ok: true });
});

