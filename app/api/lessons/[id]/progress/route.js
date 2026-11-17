import { get, run, tx } from "@/lib/db";
import { handler, ok, body, intId, ApiError } from "@/lib/api";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

/** body: { progress?: 0-100, completed?: bool, open?: bool } */
export const PUT = handler(async (req, { params }) => {
  const user = await requireUser();
  const id = intId((await params).id);
  const owned = await get(
    `SELECT l.id FROM lessons l
     JOIN courses c ON c.id=l.course_id
     JOIN subjects s ON s.id=c.subject_id
     WHERE l.id=? AND s.user_id=?`,
    id,
    user.id
  );
  if (!owned) throw new ApiError(404, "Lesson not found");

  const b = await body(req);
  const cur = await get("SELECT * FROM reading_progress WHERE user_id=? AND lesson_id=?", user.id, id);
  let progress = cur ? Number(cur.progress) : 0;
  let completed = cur ? Number(cur.completed) : 0;
  if (b.progress !== undefined) {
    const p = Math.max(0, Math.min(100, Number(b.progress) || 0));
    progress = b.reset ? p : Math.max(progress, p);
    if (progress >= 99.5 && b.autoComplete) completed = 1;
  }
  if (b.completed !== undefined) {
    completed = b.completed ? 1 : 0;
    if (completed) progress = 100;
    else if (b.reset !== false && progress >= 100) progress = 0;
  }
  await tx(async () => {
    await run(
      `INSERT INTO reading_progress (user_id, lesson_id, progress, completed, last_read_at)
       VALUES (?,?,?,?,strftime('%Y-%m-%dT%H:%M:%fZ','now'))
       ON CONFLICT(user_id, lesson_id) DO UPDATE SET
         progress=excluded.progress,
         completed=excluded.completed,
         last_read_at=excluded.last_read_at`,
      user.id,
      id,
      progress,
      completed
    );
    if (b.open) {
      await run("INSERT INTO reading_history (user_id, lesson_id) VALUES (?,?)", user.id, id);
    }
  });
  return ok({ progress, completed: !!completed });
});
