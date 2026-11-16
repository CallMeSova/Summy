import { all } from "@/lib/db";
import { handler, ok } from "@/lib/api";
import { LESSON_CARD, bool } from "@/lib/repo";

export const dynamic = "force-dynamic";

export const GET = handler(async () => {
  const rows = all(
    `${LESSON_CARD} JOIN bookmarks bm ON bm.lesson_id=l.id ORDER BY bm.created_at DESC`.replace(
      "FROM lessons l\nJOIN courses",
      "FROM lessons l\nJOIN courses"
    )
  );
  return ok(rows.map(bool));
});

