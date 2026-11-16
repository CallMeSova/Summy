import { all } from "@/lib/db";
import { handler, ok } from "@/lib/api";
import { LESSON_CARD, bool } from "@/lib/repo";

export const dynamic = "force-dynamic";

/** ?mode=recent (default): distinct lessons by last read. mode=log: raw history entries. */
export const GET = handler(async (req) => {
  const mode = new URL(req.url).searchParams.get("mode") || "recent";
  if (mode === "log") {
    const rows = all(
      `SELECT h.id AS history_id, h.read_at, x.* FROM reading_history h
       JOIN (${LESSON_CARD}) x ON x.id=h.lesson_id
       ORDER BY h.read_at DESC, h.id DESC LIMIT 200`
    );
    return ok(rows.map(bool));
  }
  const rows = all(
    `${LESSON_CARD} WHERE rp.last_read_at IS NOT NULL ORDER BY rp.last_read_at DESC LIMIT 50`
  );
  return ok(rows.map(bool));
});

