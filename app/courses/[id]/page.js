"use client";
import { use, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Play, Pencil, Trash2, ArrowUp, ArrowDown, BookOpen } from "lucide-react";
import { useApp } from "@/components/Providers";
import { api, useFetch } from "@/lib/client";
import {
  Breadcrumbs, ProgressRing, LessonItem, EmptyState, Dropdown, ConfirmDialog, ErrorState, Skeleton,
} from "@/components/ui";
import { CourseModal } from "@/components/LibraryModals";

export default function CoursePage({ params }) {
  const { id } = use(params);
  const { t, toast } = useApp();
  const router = useRouter();
  const { data: course, error, loading, reload } = useFetch(`/courses/${id}`);
  const { data: subjects } = useFetch("/subjects");
  const [edit, setEdit] = useState(false);
  const [delCourse, setDelCourse] = useState(false);
  const [delLesson, setDelLesson] = useState(null);
  const [busy, setBusy] = useState(false);

  if (error) return <ErrorState error={error} onRetry={reload} />;
  if (loading || !course) return <><Skeleton h={20} w="30%" /><div style={{ height: 20 }} /><Skeleton h={140} r={12} /></>;

  async function removeCourse() {
    setBusy(true);
    try {
      await api(`/courses/${id}`, { method: "DELETE" });
      toast(t("common.deleted"));
      router.replace("/library");
    } catch (e) { toast(e.message, "error"); setBusy(false); }
  }
  async function removeLesson() {
    setBusy(true);
    try {
      await api(`/lessons/${delLesson.id}`, { method: "DELETE" });
      toast(t("common.deleted"));
      setDelLesson(null);
      reload();
    } catch (e) { toast(e.message, "error"); }
    setBusy(false);
  }
  async function move(idx, dir) {
    const arr = course.lessons.map((l) => l.id);
    const j = idx + dir;
    if (j < 0 || j >= arr.length) return;
    [arr[idx], arr[j]] = [arr[j], arr[idx]];
    await api("/dashboard", { method: "PUT", json: { order: arr } });
    reload();
  }

  const started = course.lessons.some((l) => l.progress > 0 || l.completed);

  return (
    <>
      <Breadcrumbs items={[{ href: "/library", label: t("nav.library") }, { label: course.subject_name }, { label: course.title }]} />
      <div className="card course-hero" style={{ "--accent": course.subject_color }}>
        <ProgressRing value={course.progress} size={88} stroke={8} />
        <div className="grow">
          <span className="chip" style={{ "--chip": course.subject_color }}><i />{course.subject_name}</span>
          <h1>{course.title}</h1>
          {course.description && <p className="muted">{course.description}</p>}
          <p className="small muted" style={{ marginTop: 6 }}>
            {t("common.lessons", { n: course.lesson_count })} · {t("course.completedOf", { a: course.completed_count, b: course.lesson_count })}
          </p>
        </div>
        <div className="row" style={{ flexWrap: "wrap" }}>
          {course.resume_lesson_id && (
            <Link href={`/lessons/${course.resume_lesson_id}`} className="btn btn-primary"><Play size={16} />{started ? t("course.continue") : t("course.start")}</Link>
          )}
          <Link href={`/lessons/new?course=${id}`} className="btn btn-secondary"><Plus size={16} />{t("course.addLesson")}</Link>
          <Dropdown items={[
            { label: t("common.edit"), icon: <Pencil size={15} />, onClick: () => setEdit(true) },
            { label: t("common.delete"), icon: <Trash2 size={15} />, danger: true, onClick: () => setDelCourse(true) },
          ]} />
        </div>
      </div>

      <div className="section-head"><h2>{t("course.lessonList")}</h2></div>
      {course.lessons.length ? (
        <div className="lesson-list">
          {course.lessons.map((l, i) => (
            <LessonItem key={l.id} lesson={l} index={i + 1} actions={
              <Dropdown items={[
                { label: t("common.edit"), icon: <Pencil size={15} />, onClick: () => router.push(`/lessons/${l.id}/edit`) },
                { label: t("lib.moveUp"), icon: <ArrowUp size={15} />, disabled: i === 0, onClick: () => move(i, -1) },
                { label: t("lib.moveDown"), icon: <ArrowDown size={15} />, disabled: i === course.lessons.length - 1, onClick: () => move(i, 1) },
                { label: t("common.delete"), icon: <Trash2 size={15} />, danger: true, onClick: () => setDelLesson(l) },
              ]} />
            } />
          ))}
        </div>
      ) : (
        <div className="card">
          <EmptyState icon={BookOpen} title={t("course.noLessons")} text={t("course.noLessonsText")}
            action={<Link href={`/lessons/new?course=${id}`} className="btn btn-primary"><Plus size={16} />{t("course.addLesson")}</Link>} />
        </div>
      )}

      <CourseModal open={edit} course={course} subjects={subjects || []} onClose={() => setEdit(false)} onSaved={reload} />
      <ConfirmDialog open={delCourse} busy={busy} title={t("lib.deleteCourseTitle")} text={t("lib.deleteCourseText", { name: course.title })}
        confirmLabel={t("common.delete")} onConfirm={removeCourse} onClose={() => setDelCourse(false)} />
      <ConfirmDialog open={!!delLesson} busy={busy} title={t("course.deleteLessonTitle")} text={delLesson ? t("course.deleteLessonText", { name: delLesson.title }) : ""}
        confirmLabel={t("common.delete")} onConfirm={removeLesson} onClose={() => setDelLesson(null)} />
    </>
  );
}

