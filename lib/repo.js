import "server-only";
import { all, get } from "./db";
import { ApiError } from "./api";

const PROGRESS_EXPR = `COALESCE(AVG(CASE WHEN rp.completed=1 OR rp.progress>=99.5 THEN 100 ELSE COALESCE(rp.progress,0) END),0)`;

export function courseSelectSql() {
  return `
SELECT c.id, c.subject_id, c.title, c.description, c.position, c.created_at, c.updated_at,
  s.name AS subject_name, s.color AS subject_color, s.user_id AS user_id,
  (SELECT COUNT(*) FROM lessons l WHERE l.course_id=c.id) AS lesson_count,
  (SELECT COUNT(*) FROM lessons l JOIN reading_progress rp ON rp.lesson_id=l.id AND rp.user_id=s.user_id
     WHERE l.course_id=c.id AND (rp.completed=1 OR rp.progress>=99.5)) AS completed_count,
  (SELECT ${PROGRESS_EXPR} FROM lessons l LEFT JOIN reading_progress rp ON rp.lesson_id=l.id AND rp.user_id=s.user_id
     WHERE l.course_id=c.id) AS progress
FROM courses c JOIN subjects s ON s.id=c.subject_id`;
}

export function lessonCardSql() {
  return `
SELECT l.id, l.course_id, l.title, l.description, l.content_type, l.tags, l.position,
  l.created_at, l.updated_at,
  c.title AS course_title, s.id AS subject_id, s.name AS subject_name, s.color AS subject_color, s.user_id AS user_id,
  COALESCE(rp.progress,0) AS progress,
  CASE WHEN COALESCE(rp.completed,0)=1 OR COALESCE(rp.progress,0)>=99.5 THEN 1 ELSE 0 END AS completed,
  rp.quiz_score AS quiz_score,
  rp.quiz_total AS quiz_total,
  rp.last_read_at AS last_read_at,
  COALESCE(l.has_quiz,0) AS has_quiz,
  EXISTS(SELECT 1 FROM bookmarks b WHERE b.lesson_id=l.id AND b.user_id=s.user_id) AS bookmarked
FROM lessons l
JOIN courses c ON c.id=l.course_id
JOIN subjects s ON s.id=c.subject_id
LEFT JOIN reading_progress rp ON rp.lesson_id=l.id AND rp.user_id=s.user_id`;
}

export async function getCourse(userId, id) {
  return await get(`${courseSelectSql()} WHERE c.id=? AND s.user_id=?`, id, userId);
}

export async function lessonsOfCourse(userId, courseId) {
  return await all(
    `${lessonCardSql()} WHERE l.course_id=? AND s.user_id=? ORDER BY l.position, l.id`,
    courseId,
    userId
  );
}

const ALLOWED_POS = {
  subjects: "user_id",
  courses: "subject_id",
  lessons: "course_id",
};

export async function nextPosition(table, whereCol, whereVal) {
  if (!Object.prototype.hasOwnProperty.call(ALLOWED_POS, table)) {
    throw new ApiError(400, "Invalid table");
  }
  const expectedCol = ALLOWED_POS[table];
  if (whereCol !== expectedCol) {
    throw new ApiError(400, "Invalid column");
  }
  const row = await get(
    `SELECT COALESCE(MAX(position),-1)+1 AS n FROM ${table} WHERE ${expectedCol}=?`,
    whereVal
  );
  return Number(row?.n ?? 0);
}

export const bool = (r) =>
  r
    ? {
        ...r,
        completed: !!(r.completed || Number(r.progress) >= 99.5),
        bookmarked: !!r.bookmarked,
        has_quiz: !!r.has_quiz,
      }
    : r;
