import { batch } from "@/lib/db";
import { handler, ok } from "@/lib/api";
import { lessonCardSql, courseSelectSql, bool } from "@/lib/repo";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

const esc = (s) => s.replace(/[\\%_]/g, (m) => "\\" + m);

function snippet(text, q) {
  if (!text) return "";
  const i = text.toLowerCase().indexOf(q.toLowerCase());
  if (i < 0) return "";
  const start = Math.max(0, i - 50);
  const end = Math.min(text.length, i + q.length + 90);
  return (
    (start > 0 ? "…" : "") +
    text.slice(start, end).replace(/\s+/g, " ") +
    (end < text.length ? "…" : "")
  );
}

export const GET = handler(async (req) => {
  const user = await requireUser();
  const uid = user.id;
  const q = (new URL(req.url).searchParams.get("q") || "").trim().slice(0, 100);
  if (!q) return ok({ q, subjects: [], courses: [], lessons: [] });
  const like = `%${esc(q)}%`;

  const [subjects, courses, lessonRows] = await batch([
    [
      `SELECT * FROM subjects WHERE user_id=? AND (name LIKE ? ESCAPE '\\' OR description LIKE ? ESCAPE '\\')
       ORDER BY position LIMIT 20`,
      uid,
      like,
      like,
    ],
    [
      `${courseSelectSql()} WHERE s.user_id=? AND (c.title LIKE ? ESCAPE '\\' OR c.description LIKE ? ESCAPE '\\')
       ORDER BY c.position LIMIT 30`,
      uid,
      like,
      like,
    ],
    [
      `SELECT x.*, l2.content_text FROM (${lessonCardSql()}) x JOIN lessons l2 ON l2.id=x.id
       WHERE x.user_id=? AND (
         l2.title LIKE ? ESCAPE '\\' OR l2.description LIKE ? ESCAPE '\\'
         OR l2.tags LIKE ? ESCAPE '\\' OR l2.content_text LIKE ? ESCAPE '\\'
       )
       ORDER BY (l2.title LIKE ? ESCAPE '\\') DESC, x.updated_at DESC LIMIT 50`,
      uid,
      like,
      like,
      like,
      like,
      like,
    ],
  ]);

  const lessons = lessonRows.map((r) => {
    const { content_text, ...rest } = bool(r);
    const inTitle = r.title.toLowerCase().includes(q.toLowerCase());
    return { ...rest, snippet: inTitle ? "" : snippet(content_text, q) || snippet(r.description, q) };
  });

  return ok({ q, subjects, courses, lessons });
});
