import { all, get, run, tx } from "@/lib/db";
import { handler, ok, body, str, intId, ApiError } from "@/lib/api";
import { getCourse, lessonsOfCourse, nextPosition, bool } from "@/lib/repo";
import { removeLessonFiles } from "@/lib/files";

export const dynamic = "force-dynamic";

export const GET = handler(async (_req, { params }) => {
  const id = intId((await params).id);
  const course = getCourse(id);
  if (!course) throw new ApiError(404, "Course not found");
  const lessons = lessonsOfCourse(id).map(bool);
  // the lesson to resume: last read & unfinished, else first unfinished, else first
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
  const id = intId((await params).id);
  const cur = get("SELECT * FROM courses WHERE id=?", id);
  if (!cur) throw new ApiError(404, "Course not found");
  const b = await body(req);
  const title = b.title !== undefined ? str(b.title, { field: "title", required: true, max: 160 }) : cur.title;
  const description = b.description !== undefined ? str(b.description, { max: 1000 }) : cur.description;
  let subjectId = cur.subject_id;
  let position = cur.position;
  if (b.subject_id !== undefined && Number(b.subject_id) !== cur.subject_id) {
    subjectId = intId(b.subject_id, "subject_id");
    if (!get("SELECT 1 FROM subjects WHERE id=?", subjectId)) throw new ApiError(404, "Subject not found");
    position = nextPosition("courses", "subject_id", subjectId); // move
  }
  run(
    "UPDATE courses SET title=?, description=?, subject_id=?, position=?, updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id=?",
    title, description, subjectId, position, id
  );
  return ok(getCourse(id));
});

export const DELETE = handler(async (_req, { params }) => {
  const id = intId((await params).id);
  const files = all(
    "SELECT a.stored_name FROM attachments a JOIN lessons l ON l.id=a.lesson_id WHERE l.course_id=?", id
  );
  tx(() => run("DELETE FROM courses WHERE id=?", id));
  removeLessonFiles(files);
  return ok({ ok: true });
});

