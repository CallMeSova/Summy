import { batch } from "@/lib/db";
import { handler, ok, body } from "@/lib/api";
import { courseSelectSql, lessonCardSql, bool } from "@/lib/repo";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export const GET = handler(async () => {
  const user = await requireUser();
  const uid = user.id;

  const [
    totalsRows,
    continueRows,
    fallbackRows,
    recentLessonRows,
    recentCourseRows,
    activityRows,
    settingsRows,
  ] = await batch([
    [
      `SELECT
         (SELECT COUNT(*) FROM subjects WHERE user_id=?) AS subjects,
         (SELECT COUNT(*) FROM courses c JOIN subjects s ON s.id=c.subject_id WHERE s.user_id=?) AS courses,
         (SELECT COUNT(*) FROM lessons l JOIN courses c ON c.id=l.course_id JOIN subjects s ON s.id=c.subject_id WHERE s.user_id=?) AS lessons,
         (SELECT COUNT(*) FROM reading_progress rp JOIN lessons l ON l.id=rp.lesson_id JOIN courses c ON c.id=l.course_id JOIN subjects s ON s.id=c.subject_id WHERE rp.user_id=? AND s.user_id=? AND (rp.completed=1 OR rp.progress>=99.5)) AS completed,
         (SELECT COUNT(*) FROM bookmarks b JOIN lessons l ON l.id=b.lesson_id JOIN courses c ON c.id=l.course_id JOIN subjects s ON s.id=c.subject_id WHERE b.user_id=? AND s.user_id=?) AS bookmarks`,
      uid,
      uid,
      uid,
      uid,
      uid,
      uid,
      uid,
    ],
    [
      `${lessonCardSql()} WHERE s.user_id=? AND rp.last_read_at IS NOT NULL AND COALESCE(rp.completed,0)=0 AND COALESCE(rp.progress,0)<99.5
       ORDER BY rp.last_read_at DESC LIMIT 1`,
      uid,
    ],
    [
      `${lessonCardSql()} WHERE s.user_id=? AND COALESCE(rp.completed,0)=0 AND COALESCE(rp.progress,0)<99.5
       ORDER BY l.created_at DESC LIMIT 1`,
      uid,
    ],
    [`${lessonCardSql()} WHERE s.user_id=? ORDER BY l.created_at DESC, l.id DESC LIMIT 6`, uid],
    [`${courseSelectSql()} WHERE s.user_id=? ORDER BY c.created_at DESC, c.id DESC LIMIT 4`, uid],
    [
      "SELECT read_at FROM reading_history WHERE user_id=? AND read_at >= datetime('now','-8 days') ORDER BY read_at",
      uid,
    ],
    ["SELECT key, value FROM user_settings WHERE user_id=?", uid],
  ]);

  const continueRow = continueRows[0] || null;
  const fallback = continueRow ? null : fallbackRows[0] || null;

  return ok({
    totals: totalsRows[0] || { subjects: 0, courses: 0, lessons: 0, completed: 0, bookmarks: 0 },
    continue: bool(continueRow || fallback),
    resumed: !!continueRow,
    recentLessons: recentLessonRows.map(bool),
    recentCourses: recentCourseRows,
    activity: activityRows.map((r) => r.read_at),
    settings: Object.fromEntries(settingsRows.map((r) => [r.key, r.value])),
  });
});

/** Reorder lessons in a course: { order: [lessonId, ...] } */
export const PUT = handler(async (req) => {
  const user = await requireUser();
  const b = await body(req);
  const order = Array.isArray(b.order) ? b.order.slice(0, 500) : [];
  if (order.length) {
    await batch(
      order.map((id, i) => [
        `UPDATE lessons SET position=? WHERE id=? AND course_id IN (
           SELECT c.id FROM courses c JOIN subjects s ON s.id=c.subject_id WHERE s.user_id=?
         )`,
        i,
        Number(id),
        user.id,
      ]),
      "write"
    );
  }
  return ok({ ok: true });
});
