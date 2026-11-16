"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  X, ChevronRight, Bookmark, BookmarkCheck, MoreHorizontal, FileText, FileType2, PenLine,
  CheckCircle2, Circle, PlayCircle, AlertTriangle, Inbox,
} from "lucide-react";
import { useApp } from "./Providers";

export function Modal({ open, onClose, title, children, footer, size = "md" }) {
  const { t } = useApp();
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="overlay" onMouseDown={onClose}>
      <div className={`modal modal-${size}`} role="dialog" aria-modal="true" onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3>{title}</h3>
          <button className="icon-btn sm" onClick={onClose} aria-label={t("common.close")}><X size={16} /></button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  );
}

export function ConfirmDialog({ open, title, text, confirmLabel, danger = true, busy, onConfirm, onClose }) {
  const { t } = useApp();
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose}>{t("common.cancel")}</button>
          <button className={`btn ${danger ? "btn-danger" : "btn-primary"}`} disabled={busy} onClick={onConfirm}>
            {busy ? t("common.loading") : confirmLabel || t("common.confirm")}
          </button>
        </>
      }
    >
      <div className="confirm">
        <span className={`confirm-icon ${danger ? "danger" : ""}`}><AlertTriangle size={20} /></span>
        <p>{text}</p>
      </div>
    </Modal>
  );
}

export function PageHeader({ title, subtitle, actions, eyebrow }) {
  return (
    <div className="page-header">
      <div>
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <h1>{title}</h1>
        {subtitle && <p className="muted">{subtitle}</p>}
      </div>
      {actions && <div className="page-actions">{actions}</div>}
    </div>
  );
}

export function Breadcrumbs({ items }) {
  return (
    <nav className="crumbs" aria-label="breadcrumb">
      {items.map((it, i) => (
        <span key={i} className="crumb">
          {it.href ? <Link href={it.href}>{it.label}</Link> : <span className="current">{it.label}</span>}
          {i < items.length - 1 && <ChevronRight size={14} />}
        </span>
      ))}
    </nav>
  );
}

export function ProgressBar({ value = 0, color, thin }) {
  const v = Math.max(0, Math.min(100, value));
  return (
    <div className={`pbar ${thin ? "thin" : ""}`} role="progressbar" aria-valuenow={Math.round(v)} aria-valuemin={0} aria-valuemax={100}>
      <i style={{ width: `${v}%`, ...(color ? { background: color } : {}) }} />
    </div>
  );
}

export function ProgressRing({ value = 0, size = 64, stroke = 6, children }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(100, value));
  return (
    <div className="ring" style={{ width: size, height: size }}>
      <svg width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={r} className="ring-bg" strokeWidth={stroke} fill="none" />
        <circle cx={size / 2} cy={size / 2} r={r} stroke="var(--primary)" strokeWidth={stroke} fill="none"
          strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - v / 100)}
          transform={`rotate(-90 ${size / 2} ${size / 2})`} style={{ transition: "stroke-dashoffset .5s ease" }} />
      </svg>
      <div className="ring-label">{children ?? `${Math.round(v)}%`}</div>
    </div>
  );
}

export function EmptyState({ icon: Icon = Inbox, title, text, action }) {
  return (
    <div className="empty">
      <div className="empty-art"><Icon size={30} /></div>
      <h3>{title}</h3>
      {text && <p className="muted">{text}</p>}
      {action}
    </div>
  );
}

export function ErrorState({ error, onRetry }) {
  const { t } = useApp();
  return (
    <EmptyState
      icon={AlertTriangle}
      title={t("common.error")}
      text={error?.message}
      action={onRetry && <button className="btn btn-secondary" onClick={onRetry}>{t("common.retry")}</button>}
    />
  );
}

export function Skeleton({ h = 16, w = "100%", r = 8 }) {
  return <div className="skeleton" style={{ height: h, width: w, borderRadius: r }} />;
}

export function SkeletonCards({ n = 3 }) {
  return (
    <div className="grid">
      {Array.from({ length: n }).map((_, i) => (
        <div className="card" key={i}>
          <Skeleton h={14} w="40%" /><div style={{ height: 12 }} />
          <Skeleton h={22} w="80%" /><div style={{ height: 18 }} />
          <Skeleton h={8} />
        </div>
      ))}
    </div>
  );
}

export function Dropdown({ items, label }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    const h = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false);
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);
  return (
    <div className="dropdown" ref={ref}>
      <button className="icon-btn sm" aria-label={label || "menu"} onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen((o) => !o); }}>
        <MoreHorizontal size={18} />
      </button>
      {open && (
        <div className="menu">
          {items.filter(Boolean).map((it, i) => (
            <button key={i} className={`menu-item ${it.danger ? "danger" : ""}`} disabled={it.disabled}
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen(false); it.onClick(); }}>
              {it.icon}{it.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function BookmarkButton({ active, onClick, withLabel }) {
  const { t } = useApp();
  const label = active ? t("reader.unbookmark") : t("reader.bookmark");
  return (
    <button className={`icon-btn bm-btn ${active ? "on" : ""} ${withLabel ? "with-label" : ""}`} onClick={onClick} aria-pressed={active} aria-label={label} title={label}>
      {active ? <BookmarkCheck size={18} /> : <Bookmark size={18} />}
      {withLabel && <span>{label}</span>}
    </button>
  );
}

export const TYPE_ICON = { richtext: PenLine, markdown: FileText, pdf: FileType2 };

export function TypeBadge({ type }) {
  const { t } = useApp();
  const I = TYPE_ICON[type] || FileText;
  return <span className={`badge badge-${type}`}><I size={12} />{t(`type.${type}`)}</span>;
}

export function StatusBadge({ progress, completed }) {
  const { t } = useApp();
  if (completed) return <span className="badge badge-done"><CheckCircle2 size={12} />{t("status.completed")}</span>;
  if (progress > 0) return <span className="badge badge-progress"><PlayCircle size={12} />{t("status.inProgress")} {Math.round(progress)}%</span>;
  return <span className="badge badge-idle"><Circle size={12} />{t("status.notStarted")}</span>;
}

export function CourseCard({ course, actions }) {
  const { t } = useApp();
  return (
    <Link href={`/courses/${course.id}`} className="card course-card hoverable" style={{ "--accent": course.subject_color }}>
      <div className="course-card-top">
        <span className="chip" style={{ "--chip": course.subject_color }}><i />{course.subject_name}</span>
        {actions}
      </div>
      <h3>{course.title}</h3>
      {course.description && <p className="muted clamp-2">{course.description}</p>}
      <div className="course-card-foot">
        <div className="row between small muted">
          <span>{t("common.lessons", { n: course.lesson_count })}</span>
          <b>{Math.round(course.progress)}%</b>
        </div>
        <ProgressBar value={course.progress} color={course.subject_color} />
      </div>
    </Link>
  );
}

export function LessonItem({ lesson, index, actions, href }) {
  return (
    <Link href={href || `/lessons/${lesson.id}`} className="lesson-item">
      <span className={`lesson-num ${lesson.completed ? "done" : ""}`}>
        {lesson.completed ? <CheckCircle2 size={18} /> : index}
      </span>
      <div className="lesson-main">
        <div className="lesson-title">{lesson.title}</div>
        {lesson.description && <div className="muted small clamp-1">{lesson.description}</div>}
      </div>
      <div className="lesson-meta">
        <TypeBadge type={lesson.content_type} />
        <StatusBadge progress={lesson.progress} completed={lesson.completed} />
      </div>
      {actions && <div className="lesson-actions">{actions}</div>}
    </Link>
  );
}

