import { get, run, tx } from "@/lib/db";
import { handler, ok, body, str, intId, ApiError } from "@/lib/api";
import { getCourse, lessonsOfCourse, nextPosition, bool } from "@/lib/repo";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export const GET = handler(async (_req, { params }) => {
  const user = await requireUser();
  const id = intId((await params).id);
  const course = await getCourse(user.id, id);
  if (!course) throw new ApiError(404, "Course not found");
  const lessons = (await lessonsOfCourse(user.id, id)).map(bool);
  const resume =
    [...lessons]
      .filter((l) => l.last_read_at && !l.completed)
      .sort((a, b) => b.last_read_at.localeCompare(a.last_read_at))[0] ||
    lessons.find((l) => !l.completed) ||
    lessons[0] ||
    null;
  return ok({ ...course, lessons, resume_lesson_id: resume ? resume.id : null });
});

export const PATCH = handler(async (req, { params }) => {
  const user = await requireUser();
  const id = intId((await params).id);
  const cur = await get(
    "SELECT c.* FROM courses c JOIN subjects s ON s.id=c.subject_id WHERE c.id=? AND s.user_id=?",
    id,
    user.id
  );
  if (!cur) throw new ApiError(404, "Course not found");
  const b = await body(req);
  const title = b.title !== undefined ? str(b.title, { field: "title", required: true, max: 160 }) : cur.title;
  const description = b.description !== undefined ? str(b.description, { max: 1000 }) : cur.description;
  let subjectId = cur.subject_id;
  let position = cur.position;
  if (b.subject_id !== undefined && Number(b.subject_id) !== cur.subject_id) {
    subjectId = intId(b.subject_id, "subject_id");
    if (!(await get("SELECT 1 FROM subjects WHERE id=? AND user_id=?", subjectId, user.id))) {
      throw new ApiError(404, "Subject not found");
    }
    position = await nextPosition("courses", "subject_id", subjectId);
  }
  await run(
    "UPDATE courses SET title=?, description=?, subject_id=?, position=?, updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id=?",
    title,
    description,
    subjectId,
    position,
    id
  );
  return ok(await getCourse(user.id, id));
});

export const DELETE = handler(async (_req, { params }) => {
  const user = await requireUser();
  const id = intId((await params).id);
  const cur = await get(
    "SELECT c.id FROM courses c JOIN subjects s ON s.id=c.subject_id WHERE c.id=? AND s.user_id=?",
    id,
    user.id
  );
  if (!cur) throw new ApiError(404, "Course not found");
  await tx(async () => {
    await run("DELETE FROM courses WHERE id=?", id);
  });
  return ok({ ok: true });
});
