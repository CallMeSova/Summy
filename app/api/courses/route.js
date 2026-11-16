import { get, run } from "@/lib/db";
import { all } from "@/lib/db";
import { handler, ok, body, str, intId, ApiError } from "@/lib/api";
import { COURSE_SELECT, getCourse, nextPosition } from "@/lib/repo";

export const dynamic = "force-dynamic";

export const GET = handler(async (req) => {
  const sp = new URL(req.url).searchParams;
  const subject = sp.get("subject");
  const rows = subject
    ? all(`${COURSE_SELECT} WHERE c.subject_id=? ORDER BY c.position, c.id`, intId(subject, "subject"))
    : all(`${COURSE_SELECT} ORDER BY s.position, c.position, c.id`);
  return ok(rows);
});

export const POST = handler(async (req) => {
  const b = await body(req);
  const subjectId = intId(b.subject_id, "subject_id");
  if (!get("SELECT 1 FROM subjects WHERE id=?", subjectId)) throw new ApiError(404, "Subject not found");
  const title = str(b.title, { field: "title", required: true, max: 160 });
  const description = str(b.description, { max: 1000 });
  const r = run(
    "INSERT INTO courses (subject_id, title, description, position) VALUES (?,?,?,?)",
    subjectId, title, description, nextPosition("courses", "subject_id", subjectId)
  );
  return ok(getCourse(r.lastInsertRowid), 201);
});

/** Reorder within a subject: body { order: [courseId, ...] } */
export const PUT = handler(async (req) => {
  const b = await body(req);
  (Array.isArray(b.order) ? b.order : []).forEach((id, i) =>
    run("UPDATE courses SET position=? WHERE id=?", i, Number(id))
  );
  return ok({ ok: true });
});

