import fs from "node:fs";
import { batch } from "@/lib/db";
import { handler, ok } from "@/lib/api";
import { courseSelectSql, lessonCardSql, bool } from "@/lib/repo";
import { uploadPath } from "@/lib/files";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export const GET = handler(async () => {
  const user = await requireUser();
  const uid = user.id;

  const [
    subjects,
    courses,
    lessonRows,
    bookmarkRows,
    activityRows,
    settingsRows,
    lightContentRows,
    attachmentRows,
  ] = await batch([
    [
      `SELECT s.*, (SELECT COUNT(*) FROM courses c WHERE c.subject_id=s.id) AS course_count
       FROM subjects s WHERE s.user_id=? ORDER BY s.position, s.id`,
      uid,
    ],
    [`${courseSelectSql()} WHERE s.user_id=? ORDER BY s.position, c.position, c.id`, uid],
    [`${lessonCardSql()} WHERE s.user_id=? ORDER BY l.course_id, l.position, l.id`, uid],
    [
      `${lessonCardSql()} JOIN bookmarks bm ON bm.lesson_id=l.id AND bm.user_id=s.user_id
       WHERE s.user_id=? ORDER BY bm.created_at DESC`,
      uid,
    ],
    [
      "SELECT read_at FROM reading_history WHERE user_id=? AND read_at >= datetime('now','-8 days') ORDER BY read_at",
      uid,
    ],
    ["SELECT key, value FROM user_settings WHERE user_id=?", uid],
    [
      `SELECT l.id, l.content_json, l.content_md
       FROM lessons l
       JOIN courses c ON c.id=l.course_id
       JOIN subjects s ON s.id=c.subject_id
       WHERE s.user_id=?
         AND (LENGTH(COALESCE(l.content_md,'')) + LENGTH(COALESCE(l.content_json,''))) <= 65536`,
      uid,
    ],
    [
      `SELECT a.id, a.lesson_id, a.original_name, a.size, a.mime, a.stored_name, (a.data IS NOT NULL) AS has_blob
       FROM attachments a
       JOIN lessons l ON l.id=a.lesson_id
       JOIN courses c ON c.id=l.course_id
       JOIN subjects s ON s.id=c.subject_id
       WHERE s.user_id=?
       ORDER BY a.id DESC`,
      uid,
    ],
  ]);

  const lessons = lessonRows.map(bool);
  const bookmarks = bookmarkRows.map(bool);

  // Build map of lessons by course_id (already sorted by l.position, l.id)
  const lessonsByCourse = new Map();
  for (const l of lessons) {
    const cid = Number(l.course_id);
    if (!lessonsByCourse.has(cid)) lessonsByCourse.set(cid, []);
    lessonsByCourse.get(cid).push(l);
  }

  // Latest attachment metadata per lesson (no binary PDF data loaded!)
  const attachmentByLesson = new Map();
  for (const a of attachmentRows) {
    const lid = Number(a.lesson_id);
    if (attachmentByLesson.has(lid)) continue;
    const exists = Boolean(a.has_blob) || Boolean(a.stored_name && fs.existsSync(uploadPath(a.stored_name)));
    attachmentByLesson.set(lid, {
      id: a.id,
      original_name: a.original_name,
      size: a.size,
      mime: a.mime,
      exists,
    });
  }

  // Lightweight lesson content map (<= 64KB text/markdown; excludes heavy content)
  const contentByLesson = new Map();
  for (const r of lightContentRows) {
    contentByLesson.set(Number(r.id), {
      content_json: r.content_json || "",
      content_md: r.content_md || "",
    });
  }

  // Assemble dashboard payload
  const completedCount = lessons.filter((l) => l.completed || Number(l.progress) >= 99.5).length;
  const continueRow =
    [...lessons]
      .filter((l) => l.last_read_at && !l.completed && Number(l.progress) < 99.5)
      .sort((a, b) => String(b.last_read_at).localeCompare(String(a.last_read_at)))[0] || null;
  const fallbackRow = continueRow
    ? null
    : [...lessons]
        .filter((l) => !l.completed && Number(l.progress) < 99.5)
        .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)) || Number(b.id) - Number(a.id))[0] || null;

  const recentLessons = [...lessons]
    .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)) || Number(b.id) - Number(a.id))
    .slice(0, 6);

  const recentCourses = [...courses]
    .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)) || Number(b.id) - Number(a.id))
    .slice(0, 4);

  const entries = {
    "/dashboard": {
      totals: {
        subjects: subjects.length,
        courses: courses.length,
        lessons: lessons.length,
        completed: completedCount,
        bookmarks: bookmarks.length,
      },
      continue: continueRow || fallbackRow || null,
      resumed: !!continueRow,
      recentLessons,
      recentCourses,
      activity: activityRows.map((r) => r.read_at),
      settings: Object.fromEntries(settingsRows.map((r) => [r.key, r.value])),
    },
    "/subjects": subjects,
    "/courses": courses,
    "/courses?withSubjects=1": { subjects, courses },
    "/bookmarks": bookmarks,
  };

  // Pre-assemble each course detail page
  for (const c of courses) {
    const cLessons = lessonsByCourse.get(Number(c.id)) || [];
    const resume =
      [...cLessons]
        .filter((l) => l.last_read_at && !l.completed)
        .sort((a, b) => String(b.last_read_at).localeCompare(String(a.last_read_at)))[0] ||
      cLessons.find((l) => !l.completed) ||
      cLessons[0] ||
      null;
    entries[`/courses/${c.id}`] = {
      ...c,
      lessons: cLessons,
      subjects,
      resume_lesson_id: resume ? resume.id : null,
    };

    // Pre-assemble lightweight lessons (text/markdown <= 64KB, plus PDF metadata shell without binary blob)
    const siblings = cLessons.map((s) => ({ id: s.id, title: s.title }));
    cLessons.forEach((l, idx) => {
      const light = contentByLesson.get(Number(l.id));
      if (!light) return; // Oversized text (>64KB) will be loaded on-demand when opened
      entries[`/lessons/${l.id}`] = {
        ...l,
        ...light,
        attachment: attachmentByLesson.get(Number(l.id)) || null,
        prev: idx > 0 ? siblings[idx - 1] : null,
        next: idx < siblings.length - 1 ? siblings[idx + 1] : null,
        index: idx + 1,
        total: siblings.length,
      };
    });
  }

  return ok({ entries });
});
