import { all } from "@/lib/db";
import { handler, ok } from "@/lib/api";
import { lessonCardSql, bool } from "@/lib/repo";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

/** ?mode=recent (default): distinct lessons by last read. mode=log: raw history entries. */
export const GET = handler(async (req) => {
  const user = await requireUser();
  const mode = new URL(req.url).searchParams.get("mode") || "recent";
  if (mode === "log") {
    const rows = await all(
      `SELECT h.id AS history_id, h.read_at, x.* FROM reading_history h
       JOIN (${lessonCardSql()}) x ON x.id=h.lesson_id
       WHERE h.user_id=? AND x.user_id=?
       ORDER BY h.read_at DESC, h.id DESC LIMIT 200`,
      user.id,
      user.id
    );
    return ok(rows.map(bool));
  }
  const rows = await all(
    `${lessonCardSql()} WHERE s.user_id=? AND rp.last_read_at IS NOT NULL
     ORDER BY rp.last_read_at DESC LIMIT 50`,
    user.id
  );
  return ok(rows.map(bool));
});
