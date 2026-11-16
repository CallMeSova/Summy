import { all, get, run } from "@/lib/db";
import { handler, ok, body } from "@/lib/api";
import { COURSE_SELECT, LESSON_CARD, bool } from "@/lib/repo";

export const dynamic = "force-dynamic";

export const GET = handler(async () => {
  const totals = get(`
    SELECT (SELECT COUNT(*) FROM subjects) AS subjects,
           (SELECT COUNT(*) FROM courses) AS courses,
           (SELECT COUNT(*) FROM lessons) AS lessons,
           (SELECT COUNT(*) FROM reading_progress WHERE completed=1) AS completed,
           (SELECT COUNT(*) FROM bookmarks) AS bookmarks`);
  const continueRow = get(
    `${LESSON_CARD} WHERE rp.last_read_at IS NOT NULL AND rp.completed=0 ORDER BY rp.last_read_at DESC LIMIT 1`
  );
  const fallback = continueRow
    ? null
    : get(`${LESSON_CARD} WHERE COALESCE(rp.completed,0)=0 ORDER BY l.created_at DESC LIMIT 1`);
  const recentLessons = all(`${LESSON_CARD} ORDER BY l.created_at DESC, l.id DESC LIMIT 6`).map(bool);
  const recentCourses = all(`${COURSE_SELECT} ORDER BY c.created_at DESC, c.id DESC LIMIT 4`);
  const activity = all(
    "SELECT read_at FROM reading_history WHERE read_at >= datetime('now','-8 days') ORDER BY read_at"
  ).map((r) => r.read_at);
  const settings = Object.fromEntries(all("SELECT key, value FROM settings").map((r) => [r.key, r.value]));
  return ok({
    totals,
    continue: bool(continueRow || fallback),
    resumed: !!continueRow,
    recentLessons,
    recentCourses,
    activity,
    settings,
  });
});

/** Reorder lessons in a course: { order: [lessonId, ...] } */
export const PUT = handler(async (req) => {
  const b = await body(req);
  (Array.isArray(b.order) ? b.order : []).forEach((id, i) =>
    run("UPDATE lessons SET position=? WHERE id=?", i, Number(id))
  );
  return ok({ ok: true });
});

