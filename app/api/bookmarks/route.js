import { all } from "@/lib/db";
import { handler, ok } from "@/lib/api";
import { lessonCardSql, bool } from "@/lib/repo";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export const GET = handler(async () => {
  const user = await requireUser();
  const rows = await all(
    `${lessonCardSql()} JOIN bookmarks bm ON bm.lesson_id=l.id AND bm.user_id=s.user_id
     WHERE s.user_id=? ORDER BY bm.created_at DESC`,
    user.id
  );
  return ok(rows.map(bool));
});
