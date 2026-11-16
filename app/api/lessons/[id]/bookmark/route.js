import { get, run } from "@/lib/db";
import { handler, ok, intId, ApiError } from "@/lib/api";

export const dynamic = "force-dynamic";

/** Toggle bookmark; returns { bookmarked } */
export const POST = handler(async (_req, { params }) => {
  const id = intId((await params).id);
  if (!get("SELECT 1 FROM lessons WHERE id=?", id)) throw new ApiError(404, "Lesson not found");
  const existing = get("SELECT id FROM bookmarks WHERE lesson_id=?", id);
  if (existing) {
    run("DELETE FROM bookmarks WHERE lesson_id=?", id);
    return ok({ bookmarked: false });
  }
  run("INSERT INTO bookmarks (lesson_id) VALUES (?)", id);
  return ok({ bookmarked: true });
});

