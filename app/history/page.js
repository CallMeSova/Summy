"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { History as HistoryIcon } from "lucide-react";
import { useApp } from "@/components/Providers";
import { useFetch, relativeTime } from "@/lib/client";
import { PageHeader, EmptyState, LessonItem, ErrorState, SkeletonCards } from "@/components/ui";

export default function HistoryPage() {
  const { t, locale } = useApp();
  const [tab, setTab] = useState("recent");
  const { data, error, loading, reload } = useFetch(`/history?mode=${tab}`);

  const groups = useMemo(() => {
    if (!data || tab !== "log") return [];
    const m = new Map();
    for (const r of data) {
      const k = new Date(r.read_at).toLocaleDateString(locale === "th" ? "th-TH" : "en-US", { dateStyle: "full" });
      if (!m.has(k)) m.set(k, []);
      m.get(k).push(r);
    }
    return [...m.entries()];
  }, [data, tab, locale]);

  const time = (iso) => new Date(iso).toLocaleTimeString(locale === "th" ? "th-TH" : "en-US", { hour: "2-digit", minute: "2-digit" });

  return (
    <>
      <PageHeader title={t("history.title")} subtitle={t("history.subtitle")}
        actions={
          <div className="seg">
            <button className={tab === "recent" ? "on" : ""} onClick={() => setTab("recent")}>{t("history.tabRecent")}</button>
            <button className={tab === "log" ? "on" : ""} onClick={() => setTab("log")}>{t("history.tabLog")}</button>
          </div>
        } />
      {error ? <ErrorState error={error} onRetry={reload} /> : loading || !data ? <SkeletonCards n={2} /> : !data.length ? (
        <div className="card"><EmptyState icon={HistoryIcon} title={t("history.emptyTitle")} text={t("history.emptyText")}
          action={<Link href="/library" className="btn btn-primary">{t("nav.library")}</Link>} /></div>
      ) : tab === "recent" ? (
        <div className="lesson-list">
          {data.map((l) => (
            <LessonItem key={l.id} lesson={l} index="•" actions={<span className="muted small">{relativeTime(l.last_read_at, t)}</span>} />
          ))}
        </div>
      ) : (
        groups.map(([day, rows]) => (
          <div key={day}>
            <div className="date-head">{day}</div>
            <div className="lesson-list">
              {rows.map((l) => (
                <LessonItem key={l.history_id} lesson={l} index="•" actions={<span className="muted small">{time(l.read_at)}</span>} />
              ))}
            </div>
          </div>
        ))
      )}
    </>
  );
}

