import { all, get, run, batch } from "@/lib/db";
import { handler, ok, body, str, intId, ApiError } from "@/lib/api";
import { courseSelectSql, getCourse, nextPosition } from "@/lib/repo";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export const GET = handler(async (req) => {
  const user = await requireUser();
  const sp = new URL(req.url).searchParams;
  const subject = sp.get("subject");
  const withSubjects = sp.get("withSubjects") === "1";

  if (withSubjects) {
    const [subjects, courses] = await batch([
      [
        `SELECT s.*, (SELECT COUNT(*) FROM courses c WHERE c.subject_id=s.id) AS course_count
         FROM subjects s WHERE s.user_id=? ORDER BY s.position, s.id`,
        user.id,
      ],
      [`${courseSelectSql()} WHERE s.user_id=? ORDER BY s.position, c.position, c.id`, user.id],
    ]);
    return ok({ subjects, courses });
  }

  const rows = subject
    ? await all(
        `${courseSelectSql()} WHERE c.subject_id=? AND s.user_id=? ORDER BY c.position, c.id`,
        intId(subject, "subject"),
        user.id
      )
    : await all(`${courseSelectSql()} WHERE s.user_id=? ORDER BY s.position, c.position, c.id`, user.id);
  return ok(rows);
});

export const POST = handler(async (req) => {
  const user = await requireUser();
  const b = await body(req);
  const subjectId = intId(b.subject_id, "subject_id");
  if (!(await get("SELECT 1 FROM subjects WHERE id=? AND user_id=?", subjectId, user.id))) {
    throw new ApiError(404, "Subject not found");
  }
  const title = str(b.title, { field: "title", required: true, max: 160 });
  const description = str(b.description, { max: 1000 });
  const pos = await nextPosition("courses", "subject_id", subjectId);
  const r = await run(
    "INSERT INTO courses (subject_id, title, description, position) VALUES (?,?,?,?)",
    subjectId,
    title,
    description,
    pos
  );
  return ok(await getCourse(user.id, r.lastInsertRowid), 201);
});

/** Reorder within a subject: body { order: [courseId, ...] } */
export const PUT = handler(async (req) => {
  const user = await requireUser();
  const b = await body(req);
  const order = Array.isArray(b.order) ? b.order.slice(0, 500) : [];
  if (order.length) {
    await batch(
      order.map((id, i) => [
        `UPDATE courses SET position=? WHERE id=? AND subject_id IN (SELECT id FROM subjects WHERE user_id=?)`,
        i,
        Number(id),
        user.id,
      ]),
      "write"
    );
  }
  return ok({ ok: true });
});
