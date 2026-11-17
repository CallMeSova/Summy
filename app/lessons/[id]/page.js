"use client";
import { use, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ChevronLeft, ChevronRight, ChevronDown, Minus, Plus, Maximize2, Minimize2, Pencil, CheckCircle2, Check, ExternalLink, FileWarning, Type, ChevronsDownUp, ChevronsUpDown, ClipboardCheck,
} from "lucide-react";
import dynamic from "next/dynamic";
import { useApp } from "@/components/Providers";
import { api, useFetch } from "@/lib/client";
import { Breadcrumbs, BookmarkButton, TypeBadge, ErrorState, Skeleton, EmptyState } from "@/components/ui";
import { MarkdownView } from "@/components/content";
import QuizModal, { extractQuizFromMarkdown } from "@/components/QuizModal";

const RichView = dynamic(() => import("@/components/content").then((m) => m.RichView), { ssr: false });

const HEADS = ".reader-article .prose h1, .reader-article .prose h2, .reader-article .prose h3, .reader-article .prose h4";

function safeParse(s) {
  try { return JSON.parse(s); } catch { return null; }
}

function buildTocGroups(items) {
  if (!items.length) return [];
  // Skip a leading h1 if it matches the document title or if h2 is the main chapter level
  const h1Count = items.filter((x) => x.level === 1).length;
  const h2Count = items.filter((x) => x.level === 2).length;
  const majorMaxLevel = h1Count > 1 && h2Count === 0 ? 1 : 2;

  const groups = [];
  for (const item of items) {
    if (item.level <= majorMaxLevel || !groups.length) {
      groups.push({ ...item, children: [] });
    } else {
      groups[groups.length - 1].children.push(item);
    }
  }
  return groups;
}

export default function Reader({ params }) {
  const { id } = use(params);
  const { t, fontSize, setFontSize, width, setWidth, docFont, setDocFont, focus, setFocus, toast } = useApp();
  const { data: lesson, error, loading, reload, setData } = useFetch(`/lessons/${id}`);
  const [prog, setProg] = useState(0);
  const [toc, setToc] = useState([]);
  const [collapsedIds, setCollapsedIds] = useState({});
  const [activeToc, setActiveToc] = useState("");
  const [ready, setReady] = useState(0);
  const [quizOpen, setQuizOpen] = useState(false);
  const restored = useRef(false);
  const saveTimer = useRef(null);
  const pending = useRef(null);
  const opened = useRef(null);

  const flush = useCallback((keepalive) => {
    if (pending.current == null) return;
    const p = pending.current;
    pending.current = null;
    fetch(`/api/lessons/${id}/progress`, {
      method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ progress: p }), keepalive: !!keepalive,
    }).catch(() => {});
  }, [id]);

  // record the open event + initial progress
  useEffect(() => {
    if (!lesson || opened.current === lesson.id) return;
    opened.current = lesson.id;
    setProg(lesson.completed ? 100 : lesson.progress);
    setToc([]);
    setCollapsedIds({});
    setQuizOpen(false);
    restored.current = false;
    window.scrollTo({ top: 0 });
    api(`/lessons/${lesson.id}/progress`, { method: "PUT", json: { open: true } }).catch(() => {});
  }, [lesson]);

  useEffect(() => () => { clearTimeout(saveTimer.current); flush(true); }, [flush]);

  const markReady = useCallback(() => setReady((n) => n + 1), []);

  // PDFs have no DOM content to observe
  useEffect(() => { if (lesson?.content_type === "pdf") markReady(); }, [lesson, markReady]);

  // build TOC + restore scroll position once content is rendered
  useEffect(() => {
    if (!lesson || !ready || String(lesson.id) !== String(id)) return;
    const h = setTimeout(() => {
      const items = [...document.querySelectorAll(HEADS)].map((el, i) => {
        if (!el.id) el.id = `h-${i}`;
        return { id: el.id, text: el.textContent, level: Number(el.tagName[1]) };
      });
      setToc(items);
      if (!restored.current && lesson.content_type !== "pdf") {
        restored.current = true;
        const max = document.documentElement.scrollHeight - window.innerHeight;
        const start = lesson.completed ? 0 : lesson.progress;
        if (start > 2 && start < 99 && max > 0) window.scrollTo({ top: (start / 100) * max });
        if (max <= 40) { setProg(100); pending.current = 100; flush(); }
      }
    }, 150);
    return () => clearTimeout(h);
  }, [ready, lesson, flush, id]);

  // scroll tracking
  useEffect(() => {
    if (!lesson || lesson.content_type === "pdf") return;
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const max = document.documentElement.scrollHeight - window.innerHeight;
        const pct = max > 0 ? Math.min(100, Math.max(0, (window.scrollY / max) * 100)) : 100;
        setProg((p) => (lesson.completed ? 100 : Math.max(p, pct)));
        if (pct >= 99.5 && !lesson.completed) {
          setData((prev) => (prev ? { ...prev, completed: true, progress: 100 } : prev));
        }
        if (restored.current) {
          pending.current = pct;
          clearTimeout(saveTimer.current);
          saveTimer.current = setTimeout(() => flush(), 900);
        }
        let cur = "";
        for (const el of document.querySelectorAll(HEADS)) {
          if (!el.id) continue;
          if (el.getBoundingClientRect().top < 140) cur = el.id; else break;
        }
        setActiveToc(cur);
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => { window.removeEventListener("scroll", onScroll); cancelAnimationFrame(raf); };
  }, [lesson, flush]);

  const tocGroups = useMemo(() => buildTocGroups(toc), [toc]);
  const collapsibleGroups = useMemo(() => tocGroups.filter((g) => g.children.length > 0), [tocGroups]);
  const allCollapsed = collapsibleGroups.length > 0 && collapsibleGroups.every((g) => collapsedIds[g.id]);
  const { quiz } = useMemo(() => extractQuizFromMarkdown(lesson?.content_md), [lesson?.content_md]);

  function toggleGroup(gid) {
    setCollapsedIds((prev) => ({ ...prev, [gid]: !prev[gid] }));
  }

  function toggleAllGroups() {
    if (allCollapsed) {
      setCollapsedIds({});
    } else {
      const next = {};
      for (const g of collapsibleGroups) next[g.id] = true;
      setCollapsedIds(next);
    }
  }

  async function toggleBookmark() {
    const r = await api(`/lessons/${id}/bookmark`, { method: "POST" });
    setData({ ...lesson, bookmarked: r.bookmarked });
    toast(r.bookmarked ? t("reader.bookmarked") : t("reader.unbookmarked"));
  }
  async function toggleDone() {
    const done = !lesson.completed;
    const r = await api(`/lessons/${id}/progress`, { method: "PUT", json: { completed: done } });
    setData({ ...lesson, completed: r.completed, progress: r.progress });
    setProg(done ? 100 : r.progress);
    if (done) toast(t("reader.lessonDone"));
  }

  if (error) return <ErrorState error={error} onRetry={reload} />;
  if (loading || !lesson || String(lesson.id) !== String(id)) {
    return (
      <div className="reader-layout"><div />
        <div><Skeleton h={18} w="40%" /><div style={{ height: 18 }} /><Skeleton h={38} w="75%" /><div style={{ height: 24 }} /><Skeleton h={14} /><div style={{ height: 8 }} /><Skeleton h={14} /><div style={{ height: 8 }} /><Skeleton h={14} w="80%" /></div>
        <div /></div>
    );
  }

  const isPdf = lesson.content_type === "pdf";
  const shown = lesson.completed ? 100 : prog;
  const nextFont = { looped: "sarabun", sarabun: "sans", sans: "looped" }[docFont] || "looped";

  return (
    <div className="reader-wrap">
      {!isPdf && <div className="reader-bar"><i style={{ width: `${shown}%` }} /></div>}
      <div className="reader-top">
        <Breadcrumbs items={[
          { href: "/library", label: t("nav.library") },
          { label: lesson.subject_name },
          { href: `/courses/${lesson.course_id}`, label: lesson.course_title },
          { label: lesson.title },
        ]} />
        <div className="reader-tools">
          {!isPdf && (
            <>
              <button
                className="icon-btn sm font-switch"
                onClick={() => setDocFont(nextFont)}
                title={t("settings.docFont")}
                aria-label={t("settings.docFont")}
              >
                <Type size={14} />
                <span>{t(`font.${docFont}Short`)}</span>
              </button>
              <span className="div" />
              <button className="icon-btn sm" onClick={() => setFontSize(fontSize - 1)} title={t("reader.fontSmaller")} aria-label={t("reader.fontSmaller")}><Minus size={14} /></button>
              <span className="fs">{fontSize}px</span>
              <button className="icon-btn sm" onClick={() => setFontSize(fontSize + 1)} title={t("reader.fontLarger")} aria-label={t("reader.fontLarger")}><Plus size={14} /></button>
              <span className="div" />
              <div className="seg" style={{ border: 0, background: "transparent", padding: 0 }} role="group" aria-label={t("reader.width")}>
                {["narrow", "comfortable", "wide"].map((w) => (
                  <button key={w} className={width === w ? "on" : ""} onClick={() => setWidth(w)} style={{ padding: "4px 9px" }}>{t(`reader.${w}`)}</button>
                ))}
              </div>
              <span className="div" />
            </>
          )}
          {quiz && (
            <>
              <button
                type="button"
                className="icon-btn sm quiz-trigger-btn"
                onClick={() => setQuizOpen(true)}
                title={t("quiz.openBtn", { n: quiz.total })}
              >
                <ClipboardCheck size={14} />
                <span>
                  {lesson.quiz_score !== null && lesson.quiz_score !== undefined && Number(lesson.quiz_total) > 0
                    ? t("quiz.listScore", { a: lesson.quiz_score, b: lesson.quiz_total })
                    : t("quiz.openBtn", { n: quiz.total })}
                </span>
              </button>
              <span className="div" />
            </>
          )}
          <BookmarkButton active={lesson.bookmarked} onClick={toggleBookmark} />
          <Link href={`/lessons/${id}/edit`} className="icon-btn sm" title={t("reader.edit")} aria-label={t("reader.edit")}><Pencil size={15} /></Link>
          <button className={`icon-btn sm ${focus ? "on" : ""}`} onClick={() => setFocus(!focus)} title={focus ? t("reader.exitFocus") : t("reader.focus")} aria-label={t("reader.focus")}>
            {focus ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
          </button>
        </div>
      </div>

      <div className={`reader-layout w-${width}`}>
        <div className="reader-side-l" />
        <article className="reader-article" style={isPdf ? { gridColumn: "1 / -1", maxWidth: 1100, margin: "0 auto", width: "100%" } : undefined}>
          <header className="doc-header">
            <div className="reader-meta">
              <TypeBadge type={lesson.content_type} />
              {lesson.completed && <span className="badge badge-done"><CheckCircle2 size={12} />{t("status.completed")}</span>}
              {lesson.tags && lesson.tags.split(",").filter((x) => x.trim()).map((tg) => <span className="badge" key={tg}>#{tg.trim()}</span>)}
            </div>
            <h1 className="reader-title">{lesson.title}</h1>
            {lesson.description && <p className="reader-desc">{lesson.description}</p>}
          </header>

          {lesson.content_type === "richtext" && <RichView key={lesson.id} json={safeParse(lesson.content_json)} onReady={markReady} />}
          {lesson.content_type === "markdown" && <MarkdownView key={lesson.id} source={lesson.content_md} onReady={markReady} />}
          {isPdf && (lesson.attachment?.exists ? (
            <>
              <div className="row between" style={{ marginBottom: 10 }}>
                <span className="muted small">{lesson.attachment.original_name}</span>
                <a className="btn btn-secondary btn-sm" href={`/api/lessons/${id}/file`} target="_blank" rel="noreferrer"><ExternalLink size={14} />{t("reader.openPdf")}</a>
              </div>
              <iframe className="pdf-frame" src={`/api/lessons/${id}/file#view=FitH`} title={lesson.title} />
            </>
          ) : (
            <div className="card"><EmptyState icon={FileWarning} title={t("lesson.fileMissing")} /></div>
          ))}

          <div className="doc-complete-row">
            <button className={`btn ${lesson.completed ? "btn-secondary" : "btn-primary"}`} onClick={toggleDone}>
              <Check size={16} />{lesson.completed ? t("reader.markUndone") : t("reader.markDone")}
            </button>
            {quiz && (
              <button type="button" className="btn btn-secondary" onClick={() => setQuizOpen(true)}>
                <ClipboardCheck size={16} />
                {lesson.quiz_score !== null && lesson.quiz_score !== undefined && Number(lesson.quiz_total) > 0
                  ? `${t("quiz.listScore", { a: lesson.quiz_score, b: lesson.quiz_total })} · ${t("quiz.openBtnFull", { m: quiz.mcq.length, s: quiz.short.length })}`
                  : t("quiz.openBtnFull", { m: quiz.mcq.length, s: quiz.short.length })}
              </button>
            )}
          </div>
        </article>

        {!isPdf && (
          <aside className="toc" aria-label={t("reader.toc")} style={{ visibility: tocGroups.length ? "visible" : "hidden" }}>
            <div className="toc-head">
              <h4>{t("reader.toc")}</h4>
              {collapsibleGroups.length > 0 && (
                <button
                  type="button"
                  className="toc-collapse-all"
                  onClick={toggleAllGroups}
                  title={allCollapsed ? t("reader.expandAll") : t("reader.collapseAll")}
                >
                  {allCollapsed ? <ChevronsUpDown size={13} /> : <ChevronsDownUp size={13} />}
                  <span>{allCollapsed ? t("reader.expandAll") : t("reader.collapseAll")}</span>
                </button>
              )}
            </div>
            <div className="toc-tree">
              {tocGroups.map((g) => {
                const hasKids = g.children.length > 0;
                const isCollapsed = !!collapsedIds[g.id];
                const childActive = g.children.some((c) => c.id === activeToc);
                const parentActive = activeToc === g.id || (isCollapsed && childActive);

                return (
                  <div key={g.id} className={`toc-group ${parentActive || childActive ? "in-view" : ""}`}>
                    <div className={`toc-parent-row ${parentActive ? "on" : ""}`}>
                      {hasKids ? (
                        <button
                          type="button"
                          className="toc-toggle"
                          onClick={() => toggleGroup(g.id)}
                          aria-expanded={!isCollapsed}
                          aria-label={g.text}
                        >
                          {isCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                        </button>
                      ) : (
                        <span className="toc-bullet" aria-hidden="true" />
                      )}
                      <a
                        href={`#${g.id}`}
                        className={`toc-parent ${parentActive ? "on" : ""}`}
                        onClick={(e) => {
                          e.preventDefault();
                          document.getElementById(g.id)?.scrollIntoView({ behavior: "smooth", block: "start" });
                        }}
                      >
                        <span className="toc-parent-text">{g.text}</span>
                        {hasKids && isCollapsed && <span className="toc-count">{g.children.length}</span>}
                      </a>
                    </div>

                    {hasKids && !isCollapsed && (
                      <div className="toc-children">
                        {g.children.map((c) => (
                          <a
                            key={c.id}
                            href={`#${c.id}`}
                            className={`toc-sub l${c.level} ${activeToc === c.id ? "on" : ""}`}
                            onClick={(e) => {
                              e.preventDefault();
                              document.getElementById(c.id)?.scrollIntoView({ behavior: "smooth", block: "start" });
                            }}
                          >
                            {c.text}
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </aside>
        )}
      </div>

      <div className="reader-foot">
        {lesson.prev ? (
          <Link href={`/lessons/${lesson.prev.id}`} className="btn btn-secondary btn-sm" title={lesson.prev.title}><ChevronLeft size={15} /><span className="hide-sm">{t("reader.prev")}</span></Link>
        ) : <span className="btn btn-secondary btn-sm" style={{ opacity: 0.35 }}><ChevronLeft size={15} /></span>}
        <div className="mid">
          <div className="row"><span>{t("reader.position", { a: lesson.index, b: lesson.total })}</span><b>{isPdf ? (lesson.completed ? "100%" : "") : `${Math.round(shown)}%`}</b></div>
          <div className="pbar thin"><i style={{ width: `${isPdf ? (lesson.completed ? 100 : 0) : shown}%` }} /></div>
        </div>
        {lesson.next ? (
          <Link href={`/lessons/${lesson.next.id}`} className="btn btn-primary btn-sm" title={lesson.next.title}><span className="hide-sm">{t("reader.next")}</span><ChevronRight size={15} /></Link>
        ) : <span className="btn btn-primary btn-sm" style={{ opacity: 0.35 }}><ChevronRight size={15} /></span>}
      </div>

      <QuizModal
        open={quizOpen}
        onClose={() => setQuizOpen(false)}
        quiz={quiz}
        lessonId={lesson.id}
        lessonTitle={lesson.title}
        onScoreSaved={({ quiz_score, quiz_total }) =>
          setData((prev) => (prev ? { ...prev, quiz_score, quiz_total } : prev))
        }
      />
    </div>
  );
}
