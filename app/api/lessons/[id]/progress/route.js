import { get, run, tx } from "@/lib/db";
import { handler, ok, body, intId, ApiError } from "@/lib/api";

export const dynamic = "force-dynamic";

/** body: { progress?: 0-100, completed?: bool, open?: bool } */
export const PUT = handler(async (req, { params }) => {
  const id = intId((await params).id);
  if (!get("SELECT 1 FROM lessons WHERE id=?", id)) throw new ApiError(404, "Lesson not found");
  const b = await body(req);
  const cur = get("SELECT * FROM reading_progress WHERE lesson_id=?", id);
  let progress = cur ? cur.progress : 0;
  let completed = cur ? cur.completed : 0;
  if (b.progress !== undefined) {
    const p = Math.max(0, Math.min(100, Number(b.progress) || 0));
    // never move backwards while merely scrolling, unless explicitly reset
    progress = b.reset ? p : Math.max(progress, p);
    if (progress >= 99.5 && b.autoComplete) completed = 1;
  }
  if (b.completed !== undefined) {
    completed = b.completed ? 1 : 0;
    if (completed) progress = 100;
    else if (b.reset !== false && progress >= 100) progress = 0;
  }
  tx(() => {
    run(
      `INSERT INTO reading_progress (lesson_id, progress, completed, last_read_at)
       VALUES (?,?,?,strftime('%Y-%m-%dT%H:%M:%fZ','now'))
       ON CONFLICT(lesson_id) DO UPDATE SET progress=excluded.progress, completed=excluded.completed,
         last_read_at=excluded.last_read_at`,
      id, progress, completed
    );
    if (b.open) run("INSERT INTO reading_history (lesson_id) VALUES (?)", id);
  });
  return ok({ progress, completed: !!completed });
});

