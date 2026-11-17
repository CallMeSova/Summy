import { batch } from "@/lib/db";
import { handler, ok, body, intId, ApiError } from "@/lib/api";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

/** body: { progress?: 0-100, completed?: bool, open?: bool, quiz_score?: int, quiz_total?: int } */
export const PUT = handler(async (req, { params }) => {
  const user = await requireUser();
  const id = intId((await params).id);
  const b = await body(req);

  const [ownedRows, curRows] = await batch([
    [
      `SELECT l.id FROM lessons l
       JOIN courses c ON c.id=l.course_id
       JOIN subjects s ON s.id=c.subject_id
       WHERE l.id=? AND s.user_id=?`,
      id,
      user.id,
    ],
    ["SELECT * FROM reading_progress WHERE user_id=? AND lesson_id=?", user.id, id],
  ]);

  if (!ownedRows[0]) throw new ApiError(404, "Lesson not found");
  const cur = curRows[0];

  let progress = cur ? Number(cur.progress) : 0;
  let completed = cur ? Number(cur.completed) : 0;
  let quizScore = cur?.quiz_score !== undefined && cur?.quiz_score !== null ? Number(cur.quiz_score) : null;
  let quizTotal = cur?.quiz_total !== undefined && cur?.quiz_total !== null ? Number(cur.quiz_total) : null;

  if (b.progress !== undefined) {
    const p = Math.max(0, Math.min(100, Number(b.progress) || 0));
    progress = b.reset ? p : Math.max(progress, p);
    if (progress >= 99.5) {
      progress = 100;
      completed = 1;
    }
  }
  if (b.completed !== undefined) {
    completed = b.completed ? 1 : 0;
    if (completed) progress = 100;
    else if (b.reset !== false && progress >= 99.5) progress = 0;
  }
  if (b.quiz_score !== undefined && b.quiz_total !== undefined) {
    const qt = Math.max(1, Number(b.quiz_total) || 1);
    const qs = Math.max(0, Math.min(qt, Number(b.quiz_score) || 0));
    quizScore = qs;
    quizTotal = qt;
  }

  const writeStmts = [
    [
      `INSERT INTO reading_progress (user_id, lesson_id, progress, completed, quiz_score, quiz_total, last_read_at)
       VALUES (?,?,?,?,?,?,strftime('%Y-%m-%dT%H:%M:%fZ','now'))
       ON CONFLICT(user_id, lesson_id) DO UPDATE SET
         progress=excluded.progress,
         completed=excluded.completed,
         quiz_score=excluded.quiz_score,
         quiz_total=excluded.quiz_total,
         last_read_at=excluded.last_read_at`,
      user.id,
      id,
      progress,
      completed,
      quizScore,
      quizTotal,
    ],
  ];
  if (b.open) {
    writeStmts.push(["INSERT INTO reading_history (user_id, lesson_id) VALUES (?,?)", user.id, id]);
  }
  await batch(writeStmts, "write");

  return ok({
    progress,
    completed: !!completed,
    quiz_score: quizScore,
    quiz_total: quizTotal,
  });
});
