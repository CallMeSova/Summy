"use client";
import Link from "next/link";
import { Bookmark, BookmarkX } from "lucide-react";
import { useApp } from "@/components/Providers";
import { api, useFetch } from "@/lib/client";
import { PageHeader, EmptyState, LessonItem, ErrorState, SkeletonCards, BookmarkButton } from "@/components/ui";

export default function Bookmarks() {
  const { t, locale, toast } = useApp();
  const { data, error, loading, reload } = useFetch("/bookmarks");

  async function remove(l, e) {
    e.preventDefault();
    e.stopPropagation();
    await api(`/lessons/${l.id}/bookmark`, { method: "POST" });
    toast(t("reader.unbookmarked"));
    reload();
  }
  if (error) return <ErrorState error={error} onRetry={reload} />;
  return (
    <>
      <PageHeader title={t("bm.title")} subtitle={t("bm.subtitle")} />
      {loading || !data ? <SkeletonCards n={2} /> : !data.length ? (
        <div className="card"><EmptyState icon={BookmarkX} title={t("bm.emptyTitle")} text={t("bm.emptyText")}
          action={<Link href="/library" className="btn btn-primary">{t("nav.library")}</Link>} /></div>
      ) : (
        <div className="lesson-list">
          {data.map((l) => (
            <Link key={l.id} href={`/lessons/${l.id}`} className="lesson-item">
              <span className="lesson-num" style={{ color: "var(--primary)", background: "var(--accent)" }}><Bookmark size={17} /></span>
              <div className="lesson-main">
                <div className="lesson-title">{l.title}</div>
                <div className="muted small">{l.subject_name} · {l.course_title}</div>
              </div>
              <LessonMeta l={l} locale={locale} />
              <BookmarkButton active onClick={(e) => remove(l, e)} />
            </Link>
          ))}
        </div>
      )}
    </>
  );
}

import { TypeBadge, StatusBadge } from "@/components/ui";
function LessonMeta({ l }) {
  return <div className="lesson-meta"><TypeBadge type={l.content_type} /><StatusBadge progress={l.progress} completed={l.completed} /></div>;
}

