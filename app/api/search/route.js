import { all } from "@/lib/db";
import { handler, ok } from "@/lib/api";
import { LESSON_CARD, COURSE_SELECT, bool } from "@/lib/repo";

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
  const q = (new URL(req.url).searchParams.get("q") || "").trim().slice(0, 100);
  if (!q) return ok({ q, subjects: [], courses: [], lessons: [] });
  const like = `%${esc(q)}%`;
  const subjects = all(
    "SELECT * FROM subjects WHERE name LIKE ? ESCAPE '\\' OR description LIKE ? ESCAPE '\\' ORDER BY position LIMIT 20",
    like, like
  );
  const courses = all(
    `${COURSE_SELECT} WHERE c.title LIKE ? ESCAPE '\\' OR c.description LIKE ? ESCAPE '\\' ORDER BY c.position LIMIT 30`,
    like, like
  );
  const lessons = all(
    `SELECT x.*, l2.content_text FROM (${LESSON_CARD}) x JOIN lessons l2 ON l2.id=x.id
     WHERE l2.title LIKE ? ESCAPE '\\' OR l2.description LIKE ? ESCAPE '\\' OR l2.tags LIKE ? ESCAPE '\\'
        OR l2.content_text LIKE ? ESCAPE '\\'
     ORDER BY (l2.title LIKE ? ESCAPE '\\') DESC, x.updated_at DESC LIMIT 50`,
    like, like, like, like, like
  ).map((r) => {
    const { content_text, ...rest } = bool(r);
    const inTitle = r.title.toLowerCase().includes(q.toLowerCase());
    return { ...rest, snippet: inTitle ? "" : snippet(content_text, q) || snippet(r.description, q) };
  });
  return ok({ q, subjects, courses, lessons });
});

