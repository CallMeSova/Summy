"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PenLine, FileText, FileType2, UploadCloud, FileUp, X, Eye, Pencil, Library } from "lucide-react";
import dynamic from "next/dynamic";
import { useApp } from "./Providers";
import { api, useFetch } from "@/lib/client";
import { PageHeader, Breadcrumbs, EmptyState, Skeleton } from "./ui";
import { MarkdownView } from "./content";
import AiPromptTrigger from "./AiPromptTrigger";

const RichEditor = dynamic(() => import("./content").then((m) => m.RichEditor), {
  ssr: false,
  loading: () => <Skeleton h={340} r={12} />,
});

const MAX_PDF = 50 * 1024 * 1024;
const fmtSize = (n) => (n > 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);

const SAMPLE_MERMAID = `\n\`\`\`mermaid
flowchart LR
  A["ไฟล์เรียน (PDF / Slides)"] -->|"ใช้ AI แปลงด้วย Prompt"| B["ไฟล์สรุป (.md)"]
  B -->|"นำเข้าสู่ Summy"| C["อ่านสบายตา + กราฟ Mermaid"]
\`\`\`\n`;

function Err({ msg }) {
  return msg ? <span className="field-error">{msg}</span> : null;
}

export default function LessonForm({ lessonId, defaultCourseId }) {
  const { t, toast } = useApp();
  const router = useRouter();
  const editing = !!lessonId;
  const courses = useFetch("/courses");
  const existing = useFetch(editing ? `/lessons/${lessonId}` : null);

  const [courseId, setCourseId] = useState(defaultCourseId ? String(defaultCourseId) : "");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [type, setType] = useState("richtext");
  const [rich, setRich] = useState({ json: null, text: "" });
  const [md, setMd] = useState("");
  const [mdDebounced, setMdDebounced] = useState("");
  const [mdMobileTab, setMdMobileTab] = useState("write");
  const [file, setFile] = useState(null);
  const [over, setOver] = useState(false);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(!editing);
  const mdFile = useRef(null);
  const pdfFile = useRef(null);

  useEffect(() => {
    const d = existing.data;
    if (!editing || !d || loaded) return;
    setCourseId(String(d.course_id));
    setTitle(d.title);
    setDescription(d.description || "");
    setTags(d.tags || "");
    setType(d.content_type);
    if (d.content_type === "richtext") {
      try { setRich({ json: JSON.parse(d.content_json), text: "" }); } catch {}
    }
    if (d.content_type === "markdown") {
      setMd(d.content_md || "");
      setMdDebounced(d.content_md || "");
    }
    setLoaded(true);
  }, [existing.data, editing, loaded]);

  useEffect(() => {
    if (!courseId && !defaultCourseId && courses.data?.length) setCourseId(String(courses.data[0].id));
  }, [courses.data, courseId, defaultCourseId]);

  useEffect(() => {
    const h = setTimeout(() => setMdDebounced(md), 220);
    return () => clearTimeout(h);
  }, [md]);

  const grouped = useMemo(() => {
    const m = new Map();
    for (const c of courses.data || []) {
      if (!m.has(c.subject_name)) m.set(c.subject_name, []);
      m.get(c.subject_name).push(c);
    }
    return [...m.entries()];
  }, [courses.data]);

  function pickPdf(f) {
    if (!f) return;
    const e = {};
    if (!f.name.toLowerCase().endsWith(".pdf") || (f.type && f.type !== "application/pdf")) e.file = t("lesson.errPdfType");
    else if (f.size > MAX_PDF) e.file = t("lesson.errPdfSize");
    setErrors((x) => ({ ...x, file: e.file }));
    if (!e.file) {
      setFile(f);
      if (!title.trim()) setTitle(f.name.replace(/\.pdf$/i, ""));
    }
  }

  async function pickMd(f) {
    if (!f) return;
    if (!/\.(md|markdown|txt)$/i.test(f.name)) return setErrors((x) => ({ ...x, md: t("lesson.errMdType") }));
    if (f.size > 5 * 1024 * 1024) return setErrors((x) => ({ ...x, md: t("lesson.errMdType") }));
    const text = await f.text();
    setMd(text);
    setErrors((x) => ({ ...x, md: undefined }));
    if (!title.trim()) {
      const h1 = text.match(/^#\s+(.+)$/m);
      setTitle((h1 ? h1[1] : f.name.replace(/\.(md|markdown|txt)$/i, "")).trim().slice(0, 200));
    }
  }

  function insertSampleMermaid() {
    setMd((prev) => (prev ? `${prev.replace(/\s*$/, "\n")}${SAMPLE_MERMAID}` : SAMPLE_MERMAID.trimStart()));
  }

  async function submit(e) {
    e.preventDefault();
    const er = {};
    if (!title.trim()) er.title = t("lesson.errTitle");
    if (!courseId) er.course = t("lesson.errCourse");
    if (type === "markdown" && !md.trim()) er.md = t("lesson.errMdEmpty");
    if (type === "pdf" && !file && !editing) er.file = t("lesson.errPdfRequired");
    setErrors(er);
    if (Object.keys(er).length) return;

    setBusy(true);
    try {
      let res;
      const base = { title, description, tags, course_id: Number(courseId) };
      if (type === "pdf") {
        const form = new FormData();
        for (const [k, v] of Object.entries({ ...base, content_type: "pdf" })) form.append(k, v);
        if (file) form.append("file", file);
        res = editing ? await api(`/lessons/${lessonId}`, { method: "PATCH", form }) : await api("/lessons", { method: "POST", form });
      } else {
        const json = type === "richtext"
          ? { ...base, content_type: type, content_json: JSON.stringify(rich.json || { type: "doc", content: [] }), content_text: rich.text }
          : { ...base, content_type: type, content_md: md };
        res = editing ? await api(`/lessons/${lessonId}`, { method: "PATCH", json }) : await api("/lessons", { method: "POST", json });
      }
      toast(t("common.saved"));
      router.push(`/lessons/${res.id}`);
    } catch (e2) {
      const m = e2.message || t("common.error");
      if (type === "pdf") setErrors({ file: m });
      else if (type === "markdown") setErrors({ md: m });
      toast(m, "error");
    } finally {
      setBusy(false);
    }
  }

  if (courses.data && !courses.data.length) {
    return (
      <div className="card">
        <EmptyState icon={Library} title={t("lesson.noCourseTitle")} text={t("lesson.noCourseText")}
          action={<Link href="/library" className="btn btn-primary">{t("lesson.goLibrary")}</Link>} />
      </div>
    );
  }
  if (editing && !loaded) return <Skeleton h={400} r={12} />;

  const sources = [
    { k: "richtext", icon: PenLine, label: t("lesson.sourceRich"), hint: t("lesson.richHint") },
    { k: "markdown", icon: FileText, label: t("lesson.sourceMd"), hint: t("lesson.mdHint") },
    { k: "pdf", icon: FileType2, label: t("lesson.sourcePdf"), hint: t("lesson.pdfHint") },
  ];

  return (
    <>
      <Breadcrumbs items={[{ href: "/library", label: t("nav.library") }, { label: editing ? t("lesson.edit") : t("lesson.new") }]} />
      <PageHeader title={editing ? t("lesson.edit") : t("lesson.new")} />
      <form className="card form-card stack" onSubmit={submit} noValidate style={{ gap: 20 }}>
        <div className="form-grid">
          <div className="field full">
            <label htmlFor="lt">{t("lesson.title")}</label>
            <input id="lt" className={`input ${errors.title ? "invalid" : ""}`} value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} placeholder={t("lesson.titlePh")} autoFocus />
            <Err msg={errors.title} />
          </div>
          <div className="field">
            <label htmlFor="lc">{t("lesson.course")}</label>
            <select id="lc" className="select" value={courseId} onChange={(e) => setCourseId(e.target.value)}>
              {grouped.map(([s, list]) => (
                <optgroup key={s} label={s}>{list.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}</optgroup>
              ))}
            </select>
            <Err msg={errors.course} />
          </div>
          <div className="field">
            <label htmlFor="ltag">{t("lesson.tags")} <span className="opt">({t("common.optional")})</span></label>
            <input id="ltag" className="input" value={tags} onChange={(e) => setTags(e.target.value)} placeholder={t("lesson.tagsPh")} maxLength={300} />
          </div>
          <div className="field full">
            <label htmlFor="ld">{t("lesson.description")} <span className="opt">({t("common.optional")})</span></label>
            <input id="ld" className="input" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={1000} />
          </div>
        </div>

        {!editing && (
          <div className="field">
            <label>{t("lesson.source")}</label>
            <div className="source-cards">
              {sources.map((s) => (
                <button type="button" key={s.k} className={`source-card ${type === s.k ? "on" : ""}`} onClick={() => setType(s.k)}>
                  <s.icon size={20} /><b>{s.label}</b><span>{s.hint}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <AiPromptTrigger
          onInsertSample={type === "markdown" ? insertSampleMermaid : undefined}
        />

        {type === "richtext" && <RichEditor value={rich.json} onChange={setRich} />}

        {type === "markdown" && (
          <div className="stack" style={{ gap: 10 }}>
            <div className="row" style={{ flexWrap: "wrap" }}>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => mdFile.current?.click()}><FileUp size={15} />{t("lesson.pickMd")}</button>
              <input ref={mdFile} type="file" accept=".md,.markdown,.txt,text/markdown,text/plain" hidden onChange={(e) => { pickMd(e.target.files?.[0]); e.target.value = ""; }} />
              <div className="seg show-sm-only" style={{ marginLeft: "auto" }}>
                <button type="button" className={mdMobileTab === "write" ? "on" : ""} onClick={() => setMdMobileTab("write")}><Pencil size={14} />{t("lesson.write")}</button>
                <button type="button" className={mdMobileTab === "preview" ? "on" : ""} onClick={() => setMdMobileTab("preview")}><Eye size={14} />{t("lesson.preview")}</button>
              </div>
            </div>
            <div className="md-split">
              <textarea className={`textarea ${errors.md ? "invalid" : ""} ${mdMobileTab === "preview" ? "md-hide" : ""}`} value={md} onChange={(e) => setMd(e.target.value)} placeholder={t("lesson.mdPaste")} spellCheck={false} />
              <div className={`md-preview ${mdMobileTab === "write" ? "md-hide" : ""}`}>
                {mdDebounced ? <MarkdownView source={mdDebounced} /> : <p className="muted">{t("lesson.preview")}</p>}
              </div>
            </div>
            <Err msg={errors.md} />
          </div>
        )}

        {type === "pdf" && (
          <div>
            {editing && existing.data?.attachment && !file && (
              <div className="file-pill"><FileType2 size={18} /><span className="grow">{t("lesson.currentFile")}: {existing.data.attachment.original_name} · {fmtSize(existing.data.attachment.size)}</span></div>
            )}
            <div
              className={`dropzone ${over ? "over" : ""} ${errors.file ? "invalid" : ""}`}
              style={{ marginTop: 10 }}
              onClick={() => pdfFile.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setOver(true); }}
              onDragLeave={() => setOver(false)}
              onDrop={(e) => { e.preventDefault(); setOver(false); pickPdf(e.dataTransfer.files?.[0]); }}
              role="button" tabIndex={0}
              onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && pdfFile.current?.click()}
            >
              <UploadCloud size={34} />
              <b>{editing ? t("lesson.replacePdf") : t("lesson.dropPdf")}</b>
              <span className="muted small">{t("lesson.orBrowse")}</span>
              <input ref={pdfFile} type="file" accept=".pdf,application/pdf" hidden onChange={(e) => { pickPdf(e.target.files?.[0]); e.target.value = ""; }} />
            </div>
            {file && (
              <div className="file-pill">
                <FileType2 size={18} /><span className="grow">{file.name} · {fmtSize(file.size)}</span>
                <button type="button" className="icon-btn sm" onClick={() => setFile(null)} aria-label={t("common.close")}><X size={14} /></button>
              </div>
            )}
            <Err msg={errors.file} />
          </div>
        )}

        <div className="form-actions">
          <button type="button" className="btn btn-ghost" onClick={() => router.back()}>{t("common.cancel")}</button>
          <button className="btn btn-primary" disabled={busy}>{busy ? t("common.loading") : t("common.save")}</button>
        </div>
      </form>
    </>
  );
}
