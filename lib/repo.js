import { all, get } from "./db";

const PROGRESS_EXPR = `COALESCE(AVG(CASE WHEN rp.completed=1 THEN 100 ELSE COALESCE(rp.progress,0) END),0)`;

export const COURSE_SELECT = `
SELECT c.id, c.subject_id, c.title, c.description, c.position, c.created_at, c.updated_at,
  s.name AS subject_name, s.color AS subject_color,
  (SELECT COUNT(*) FROM lessons l WHERE l.course_id=c.id) AS lesson_count,
  (SELECT COUNT(*) FROM lessons l JOIN reading_progress rp ON rp.lesson_id=l.id
     WHERE l.course_id=c.id AND rp.completed=1) AS completed_count,
  (SELECT ${PROGRESS_EXPR} FROM lessons l LEFT JOIN reading_progress rp ON rp.lesson_id=l.id
     WHERE l.course_id=c.id) AS progress
FROM courses c JOIN subjects s ON s.id=c.subject_id`;

export const LESSON_CARD = `
SELECT l.id, l.course_id, l.title, l.description, l.content_type, l.tags, l.position,
  l.created_at, l.updated_at,
  c.title AS course_title, s.id AS subject_id, s.name AS subject_name, s.color AS subject_color,
  COALESCE(rp.progress,0) AS progress, COALESCE(rp.completed,0) AS completed,
  rp.last_read_at AS last_read_at,
  EXISTS(SELECT 1 FROM bookmarks b WHERE b.lesson_id=l.id) AS bookmarked
FROM lessons l
JOIN courses c ON c.id=l.course_id
JOIN subjects s ON s.id=c.subject_id
LEFT JOIN reading_progress rp ON rp.lesson_id=l.id`;

export function getCourse(id) {
  return get(`${COURSE_SELECT} WHERE c.id=?`, id);
}

export function lessonsOfCourse(courseId) {
  return all(`${LESSON_CARD} WHERE l.course_id=? ORDER BY l.position, l.id`, courseId);
}

export function nextPosition(table, whereCol, whereVal) {
  const row = whereCol
    ? get(`SELECT COALESCE(MAX(position),-1)+1 AS n FROM ${table} WHERE ${whereCol}=?`, whereVal)
    : get(`SELECT COALESCE(MAX(position),-1)+1 AS n FROM ${table}`);
  return row.n;
}

export const bool = (r) => (r ? { ...r, completed: !!r.completed, bookmarked: !!r.bookmarked } : r);

