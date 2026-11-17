"use client";
import { useMemo, useState } from "react";
import { Search, Plus, Pencil, Trash2, ArrowUp, ArrowDown, FolderOpen, Library as LibIcon, FolderPlus } from "lucide-react";
import { useApp } from "@/components/Providers";
import { api, useFetch } from "@/lib/client";
import { PageHeader, CourseCard, EmptyState, Dropdown, ConfirmDialog, SkeletonCards, ErrorState } from "@/components/ui";
import { SubjectModal, CourseModal } from "@/components/LibraryModals";

export default function LibraryPage() {
  const { t, toast } = useApp();
  const lib = useFetch("/courses?withSubjects=1");
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("all");
  const [sort, setSort] = useState("manual");
  const [subjectModal, setSubjectModal] = useState({ open: false, item: null });
  const [courseModal, setCourseModal] = useState({ open: false, item: null, subjectId: null });
  const [del, setDel] = useState(null); // {kind,item}
  const [busy, setBusy] = useState(false);

  const reload = () => lib.reload();
  const subjectsData = lib.data?.subjects;
  const coursesData = lib.data?.courses;

  const groups = useMemo(() => {
    if (!subjectsData || !coursesData) return [];
    const needle = q.trim().toLowerCase();
    return subjectsData
      .filter((s) => filter === "all" || String(s.id) === filter)
      .map((s) => {
        let list = coursesData.filter((c) => c.subject_id === s.id);
        if (needle) list = list.filter((c) => (c.title + " " + c.description).toLowerCase().includes(needle));
        if (sort === "name") list = [...list].sort((a, b) => a.title.localeCompare(b.title));
        if (sort === "progress") list = [...list].sort((a, b) => b.progress - a.progress);
        if (sort === "newest") list = [...list].sort((a, b) => b.created_at.localeCompare(a.created_at));
        return { subject: s, courses: list };
      });
  }, [subjectsData, coursesData, q, filter, sort]);

  async function move(kind, list, idx, dir) {
    const arr = list.map((x) => x.id);
    const j = idx + dir;
    if (j < 0 || j >= arr.length) return;
    [arr[idx], arr[j]] = [arr[j], arr[idx]];
    await api(kind === "subject" ? "/subjects" : "/courses", { method: "PUT", json: { order: arr } });
    reload();
  }

  async function doDelete() {
    setBusy(true);
    try {
      await api(`/${del.kind === "subject" ? "subjects" : "courses"}/${del.item.id}`, { method: "DELETE" });
      toast(t("common.deleted"));
      setDel(null);
      if (del.kind === "subject" && filter === String(del.item.id)) setFilter("all");
      reload();
    } catch (e) {
      toast(e.message, "error");
    } finally {
      setBusy(false);
    }
  }

  if (lib.error) return <ErrorState error={lib.error} onRetry={reload} />;
  const loading = lib.loading || !subjectsData || !coursesData;
  const subjects = subjectsData || [];

  return (
    <>
      <PageHeader
        title={t("lib.title")}
        subtitle={t("lib.subtitle")}
        actions={<>
          <button className="btn btn-secondary" onClick={() => setSubjectModal({ open: true, item: null })}><FolderPlus size={16} />{t("lib.addSubject")}</button>
          <button className="btn btn-primary" disabled={!subjects.length} onClick={() => setCourseModal({ open: true, item: null, subjectId: filter !== "all" ? filter : null })}><Plus size={16} />{t("lib.addCourse")}</button>
        </>}
      />

      {subjects.length > 0 && (
        <>
          <div className="toolbar">
            <div className="input-icon"><Search size={16} /><input className="input" placeholder={t("lib.search")} value={q} onChange={(e) => setQ(e.target.value)} /></div>
            <select className="select" value={sort} onChange={(e) => setSort(e.target.value)} aria-label={t("lib.sort")}>
              <option value="manual">{t("lib.sortManual")}</option>
              <option value="name">{t("lib.sortName")}</option>
              <option value="progress">{t("lib.sortProgress")}</option>
              <option value="newest">{t("lib.sortNewest")}</option>
            </select>
          </div>
          <div className="subject-tabs">
            <button className={`subject-tab ${filter === "all" ? "on" : ""}`} onClick={() => setFilter("all")}>{t("lib.allSubjects")}</button>
            {subjects.map((s) => (
              <button key={s.id} className={`subject-tab ${filter === String(s.id) ? "on" : ""}`} style={{ "--c": s.color }} onClick={() => setFilter(String(s.id))}>
                <i />{s.name}<span className="cnt">{s.course_count}</span>
              </button>
            ))}
          </div>
        </>
      )}

      {loading ? <SkeletonCards n={3} /> : !subjects.length ? (
        <div className="card">
          <EmptyState icon={LibIcon} title={t("lib.emptyTitle")} text={t("lib.emptyText")}
            action={<button className="btn btn-primary" onClick={() => setSubjectModal({ open: true, item: null })}><FolderPlus size={16} />{t("lib.addSubject")}</button>} />
        </div>
      ) : (
        groups.map(({ subject: s, courses }, gi) => (
          <section className="subject-block" key={s.id}>
            <div className="subject-head">
              <span className="subject-dot" style={{ "--c": s.color }} />
              <div className="grow">
                <h2>{s.name}</h2>
                {s.description && <p className="muted small">{s.description}</p>}
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => setCourseModal({ open: true, item: null, subjectId: s.id })}><Plus size={14} />{t("lib.addCourse")}</button>
              <Dropdown items={[
                { label: t("common.edit"), icon: <Pencil size={15} />, onClick: () => setSubjectModal({ open: true, item: s }) },
                { label: t("lib.moveUp"), icon: <ArrowUp size={15} />, disabled: gi === 0 || filter !== "all", onClick: () => move("subject", subjects, subjects.findIndex((x) => x.id === s.id), -1) },
                { label: t("lib.moveDown"), icon: <ArrowDown size={15} />, disabled: filter !== "all" || subjects.findIndex((x) => x.id === s.id) === subjects.length - 1, onClick: () => move("subject", subjects, subjects.findIndex((x) => x.id === s.id), 1) },
                { label: t("common.delete"), icon: <Trash2 size={15} />, danger: true, onClick: () => setDel({ kind: "subject", item: s }) },
              ]} />
            </div>
            {courses.length ? (
              <div className="grid">
                {courses.map((c, ci) => (
                  <CourseCard key={c.id} course={c} actions={
                    <Dropdown items={[
                      { label: t("common.edit"), icon: <Pencil size={15} />, onClick: () => setCourseModal({ open: true, item: c, subjectId: null }) },
                      { label: t("lib.moveUp"), icon: <ArrowUp size={15} />, disabled: sort !== "manual" || q || ci === 0, onClick: () => move("course", courses, ci, -1) },
                      { label: t("lib.moveDown"), icon: <ArrowDown size={15} />, disabled: sort !== "manual" || q || ci === courses.length - 1, onClick: () => move("course", courses, ci, 1) },
                      { label: t("common.delete"), icon: <Trash2 size={15} />, danger: true, onClick: () => setDel({ kind: "course", item: c }) },
                    ]} />
                  } />
                ))}
              </div>
            ) : (
              <div className="card"><EmptyState icon={FolderOpen} title={q ? t("lib.noMatch") : t("lib.emptySubject")}
                action={!q && <button className="btn btn-secondary" onClick={() => setCourseModal({ open: true, item: null, subjectId: s.id })}><Plus size={16} />{t("lib.addCourse")}</button>} /></div>
            )}
          </section>
        ))
      )}

      <SubjectModal open={subjectModal.open} subject={subjectModal.item} onClose={() => setSubjectModal({ open: false, item: null })} onSaved={reload} />
      <CourseModal open={courseModal.open} course={courseModal.item} subjects={subjects} defaultSubjectId={courseModal.subjectId}
        onClose={() => setCourseModal({ open: false, item: null, subjectId: null })} onSaved={reload} />
      <ConfirmDialog
        open={!!del}
        busy={busy}
        title={del?.kind === "subject" ? t("lib.deleteSubjectTitle") : t("lib.deleteCourseTitle")}
        text={del ? t(del.kind === "subject" ? "lib.deleteSubjectText" : "lib.deleteCourseText", { name: del.item.name || del.item.title }) : ""}
        confirmLabel={t("common.delete")}
        onConfirm={doDelete}
        onClose={() => setDel(null)}
      />
    </>
  );
}

