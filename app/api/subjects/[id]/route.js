import { all, get, run, tx } from "@/lib/db";
import { handler, ok, body, str, intId, ApiError } from "@/lib/api";
import { COURSE_SELECT } from "@/lib/repo";
import { removeLessonFiles } from "@/lib/files";

export const dynamic = "force-dynamic";

export const GET = handler(async (_req, { params }) => {
  const id = intId((await params).id);
  const subject = get("SELECT * FROM subjects WHERE id=?", id);
  if (!subject) throw new ApiError(404, "Subject not found");
  const courses = all(`${COURSE_SELECT} WHERE c.subject_id=? ORDER BY c.position, c.id`, id);
  return ok({ ...subject, courses });
});

export const PATCH = handler(async (req, { params }) => {
  const id = intId((await params).id);
  const cur = get("SELECT * FROM subjects WHERE id=?", id);
  if (!cur) throw new ApiError(404, "Subject not found");
  const b = await body(req);
  const name = b.name !== undefined ? str(b.name, { field: "name", required: true, max: 120 }) : cur.name;
  const description = b.description !== undefined ? str(b.description, { max: 500 }) : cur.description;
  const color = /^#[0-9a-fA-F]{6}$/.test(b.color || "") ? b.color : cur.color;
  run(
    "UPDATE subjects SET name=?, description=?, color=?, updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id=?",
    name, description, color, id
  );
  return ok(get("SELECT * FROM subjects WHERE id=?", id));
});

export const DELETE = handler(async (_req, { params }) => {
  const id = intId((await params).id);
  const lessonIds = all(
    "SELECT l.id FROM lessons l JOIN courses c ON c.id=l.course_id WHERE c.subject_id=?", id
  ).map((r) => r.id);
  const files = lessonIds.flatMap((lid) => all("SELECT stored_name FROM attachments WHERE lesson_id=?", lid));
  tx(() => run("DELETE FROM subjects WHERE id=?", id));
  removeLessonFiles(files);
  return ok({ ok: true });
});

