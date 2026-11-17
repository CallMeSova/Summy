import { get, run } from "@/lib/db";
import { handler, ok, intId, ApiError } from "@/lib/api";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

/** Toggle bookmark; returns { bookmarked } */
export const POST = handler(async (_req, { params }) => {
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

  const existing = await get("SELECT id FROM bookmarks WHERE user_id=? AND lesson_id=?", user.id, id);
  if (existing) {
    await run("DELETE FROM bookmarks WHERE user_id=? AND lesson_id=?", user.id, id);
    return ok({ bookmarked: false });
  }
  await run("INSERT INTO bookmarks (user_id, lesson_id) VALUES (?,?)", user.id, id);
  return ok({ bookmarked: true });
});
