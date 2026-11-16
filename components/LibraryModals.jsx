"use client";
import { useEffect, useState } from "react";
import { Modal } from "./ui";
import { useApp } from "./Providers";
import { api } from "@/lib/client";

export const COLORS = ["#0070F3", "#171717", "#0D9488", "#E5484D", "#D97706", "#2563EB", "#4F46E5", "#16A34A"];

export function SubjectModal({ open, subject, onClose, onSaved }) {
  const { t, toast } = useApp();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState(COLORS[0]);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setName(subject?.name || "");
      setDescription(subject?.description || "");
      setColor(subject?.color || COLORS[Math.floor(Math.random() * COLORS.length)]);
      setErr("");
    }
  }, [open, subject]);

  async function submit(e) {
    e?.preventDefault();
    if (!name.trim()) return setErr(t("common.name"));
    setBusy(true);
    try {
      const json = { name, description, color };
      const saved = subject
        ? await api(`/subjects/${subject.id}`, { method: "PATCH", json })
        : await api("/subjects", { method: "POST", json });
      toast(t("common.saved"));
      onSaved?.(saved);
      onClose();
    } catch (e2) {
      setErr(e2.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={subject ? t("lib.editSubject") : t("lib.addSubject")}
      footer={<>
        <button className="btn btn-ghost" onClick={onClose}>{t("common.cancel")}</button>
        <button className="btn btn-primary" disabled={busy} onClick={submit}>{t("common.save")}</button>
      </>}>
      <form className="stack" onSubmit={submit}>
        <div className="field">
          <label>{t("common.name")}</label>
          <input className={`input ${err ? "invalid" : ""}`} value={name} onChange={(e) => setName(e.target.value)} autoFocus maxLength={120} placeholder={t("welcome.sample")} />
          {err && <span className="field-error">{err}</span>}
        </div>
        <div className="field">
          <label>{t("common.description")} <span className="opt">({t("common.optional")})</span></label>
          <textarea className="textarea" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={500} />
        </div>
        <div className="field">
          <label>{t("lib.color")}</label>
          <div className="color-row">
            {COLORS.map((c) => (
              <button type="button" key={c} className={`swatch ${c === color ? "on" : ""}`} style={{ "--c": c }} onClick={() => setColor(c)} aria-label={c} />
            ))}
          </div>
        </div>
      </form>
    </Modal>
  );
}

export function CourseModal({ open, course, subjects, defaultSubjectId, onClose, onSaved }) {
  const { t, toast } = useApp();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setTitle(course?.title || "");
      setDescription(course?.description || "");
      setSubjectId(String(course?.subject_id || defaultSubjectId || subjects?.[0]?.id || ""));
      setErr("");
    }
  }, [open, course, defaultSubjectId, subjects]);

  async function submit(e) {
    e?.preventDefault();
    if (!title.trim()) return setErr(t("lib.courseTitle"));
    if (!subjectId) return setErr(t("lib.needSubject"));
    setBusy(true);
    try {
      const json = { title, description, subject_id: Number(subjectId) };
      const saved = course
        ? await api(`/courses/${course.id}`, { method: "PATCH", json })
        : await api("/courses", { method: "POST", json });
      toast(t("common.saved"));
      onSaved?.(saved);
      onClose();
    } catch (e2) {
      setErr(e2.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={course ? t("lib.editCourse") : t("lib.addCourse")}
      footer={<>
        <button className="btn btn-ghost" onClick={onClose}>{t("common.cancel")}</button>
        <button className="btn btn-primary" disabled={busy} onClick={submit}>{t("common.save")}</button>
      </>}>
      <form className="stack" onSubmit={submit}>
        <div className="field">
          <label>{t("lib.courseTitle")}</label>
          <input className={`input ${err ? "invalid" : ""}`} value={title} onChange={(e) => setTitle(e.target.value)} autoFocus maxLength={160} placeholder={t("welcome.sampleCourse")} />
          {err && <span className="field-error">{err}</span>}
        </div>
        <div className="field">
          <label>{course ? t("lib.moveTo") : t("lib.subject")}</label>
          <select className="select" value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
            {(subjects || []).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div className="field">
          <label>{t("common.description")} <span className="opt">({t("common.optional")})</span></label>
          <textarea className="textarea" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={1000} />
        </div>
      </form>
    </Modal>
  );
}

