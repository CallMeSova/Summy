"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Search as SearchIcon, FolderOpen, BookOpen, Layers } from "lucide-react";
import { Suspense } from "react";
import { useApp } from "@/components/Providers";
import { useFetch } from "@/lib/client";
import { PageHeader, EmptyState, TypeBadge } from "@/components/ui";

function Hl({ text, q }) {
  if (!q || !text) return text;
  const i = text.toLowerCase().indexOf(q.toLowerCase());
  if (i < 0) return text;
  return <>{text.slice(0, i)}<mark>{text.slice(i, i + q.length)}</mark>{text.slice(i + q.length)}</>;
}

function SearchInner() {
  const { t } = useApp();
  const router = useRouter();
  const sp = useSearchParams();
  const initial = sp.get("q") || "";
  const [q, setQ] = useState(initial);
  const [debounced, setDebounced] = useState(initial);

  useEffect(() => {
    const h = setTimeout(() => {
      setDebounced(q.trim());
      router.replace(q.trim() ? `/search?q=${encodeURIComponent(q.trim())}` : "/search", { scroll: false });
    }, 250);
    return () => clearTimeout(h);
  }, [q, router]);

  const { data, loading } = useFetch(debounced ? `/search?q=${encodeURIComponent(debounced)}` : null);
  const empty = data && !data.subjects.length && !data.courses.length && !data.lessons.length;

  return (
    <>
      <PageHeader title={t("search.title")} subtitle={t("search.subtitle")} />
      <div className="input-icon" style={{ marginBottom: 26, maxWidth: 640 }}>
        <SearchIcon size={18} />
        <input className="input" style={{ padding: "13px 14px 13px 42px", fontSize: 16, borderRadius: 12 }} autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("search.placeholder")} />
      </div>

      {!debounced && <div className="card"><EmptyState icon={SearchIcon} title={t("search.hint")} /></div>}
      {debounced && loading && !data && <p className="muted">{t("common.loading")}</p>}
      {empty && <div className="card"><EmptyState icon={SearchIcon} title={t("search.noResults", { q: debounced })} /></div>}

      {data?.subjects.length > 0 && (
        <div className="result-group">
          <h2><Layers size={16} />{t("search.subjects")}</h2>
          {data.subjects.map((s) => (
            <Link key={s.id} className="result" href="/library">
              <div className="t"><Hl text={s.name} q={debounced} /></div>
              {s.description && <div className="muted small"><Hl text={s.description} q={debounced} /></div>}
            </Link>
          ))}
        </div>
      )}
      {data?.courses.length > 0 && (
        <div className="result-group">
          <h2><FolderOpen size={16} />{t("search.courses")}</h2>
          {data.courses.map((c) => (
            <Link key={c.id} className="result" href={`/courses/${c.id}`}>
              <div className="where"><span className="chip" style={{ "--chip": c.subject_color }}><i />{c.subject_name}</span></div>
              <div className="t"><Hl text={c.title} q={debounced} /></div>
              {c.description && <div className="muted small clamp-1"><Hl text={c.description} q={debounced} /></div>}
            </Link>
          ))}
        </div>
      )}
      {data?.lessons.length > 0 && (
        <div className="result-group">
          <h2><BookOpen size={16} />{t("search.lessons")}</h2>
          {data.lessons.map((l) => (
            <Link key={l.id} className="result" href={`/lessons/${l.id}`}>
              <div className="where">
                <span className="chip" style={{ "--chip": l.subject_color }}><i />{l.subject_name}</span>
                <span>›</span><span>{l.course_title}</span>
                <span style={{ marginLeft: "auto" }}><TypeBadge type={l.content_type} /></span>
              </div>
              <div className="t"><Hl text={l.title} q={debounced} /></div>
              {l.snippet && <div className="muted small"><Hl text={l.snippet} q={debounced} /></div>}
            </Link>
          ))}
        </div>
      )}
    </>
  );
}

export default function SearchPage() {
  return <Suspense><SearchInner /></Suspense>;
}

