"use client";
import { useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BookOpen, FolderOpen, CheckCircle2, ArrowRight, Play, PlusCircle, Layers } from "lucide-react";
import { useApp } from "@/components/Providers";
import { useFetch } from "@/lib/client";
import { CourseCard, LessonItem, ProgressBar, SkeletonCards, ErrorState, EmptyState } from "@/components/ui";
import AiPromptTrigger from "@/components/AiPromptTrigger";

function Activity({ stamps }) {
  const { t, locale } = useApp();
  const days = useMemo(() => {
    const out = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - i);
      out.push({ d, n: 0 });
    }
    for (const s of stamps) {
      const x = new Date(s);
      x.setHours(0, 0, 0, 0);
      const slot = out.find((o) => o.d.getTime() === x.getTime());
      if (slot) slot.n++;
    }
    return out;
  }, [stamps]);
  const max = Math.max(1, ...days.map((d) => d.n));
  return (
    <div className="card">
      <div className="row between"><b>{t("dash.activity")}</b></div>
      <p className="muted small">{t("dash.activityHint")}</p>
      <div className="spark">
        {days.map((d, i) => (
          <div className="spark-col" key={i}>
            {d.n > 0 && <em>{d.n}</em>}
            <div className={`spark-bar ${d.n ? "" : "zero"} ${i === 6 ? "today" : ""}`} style={{ height: `${Math.max(4, (d.n / max) * 80)}%` }} />
            <small>{d.d.toLocaleDateString(locale === "th" ? "th-TH" : "en-US", { weekday: "short" })}</small>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { t } = useApp();
  const router = useRouter();
  const { data, error, loading, reload } = useFetch("/dashboard");

  useEffect(() => {
    if (data && data.totals.subjects === 0) router.replace("/welcome");
  }, [data, router]);

  const h = new Date().getHours();
  const greet = h < 5 ? "dash.greetNight" : h < 12 ? "dash.greetMorning" : h < 17 ? "dash.greetAfternoon" : h < 21 ? "dash.greetEvening" : "dash.greetNight";

  if (error) return <ErrorState error={error} onRetry={reload} />;
  if (loading || !data || data.totals.subjects === 0) return <SkeletonCards n={3} />;

  const { totals, continue: cont } = data;
  const stats = [
    { icon: Layers, label: t("dash.subjects"), v: totals.subjects },
    { icon: BookOpen, label: t("dash.lessons"), v: totals.lessons },
    { icon: CheckCircle2, label: t("dash.completed"), v: totals.completed },
  ];

  return (
    <>
      <section className="hero">
        <span className="crosshair tl" aria-hidden="true" />
        <span className="crosshair tr" aria-hidden="true" />
        <span className="crosshair bl" aria-hidden="true" />
        <span className="crosshair br" aria-hidden="true" />
        <div className="hero-grid">
          <div className="hero-copy">
            <div className="hero-eyebrow">
              <span className="dot" />
              <span>PERSONAL DOCUMENTATION &amp; LIBRARY</span>
            </div>
            <h1>{t(greet)}</h1>
            <p>{t("dash.welcome")}</p>
            <div className="row" style={{ marginTop: 22, flexWrap: "wrap" }}>
              <Link href="/lessons/new" className="btn btn-primary"><PlusCircle size={16} />{t("nav.newLesson")}</Link>
              <Link href="/library" className="btn btn-secondary"><FolderOpen size={16} />{t("nav.library")}</Link>
            </div>
          </div>
          {cont ? (
            <Link href={`/lessons/${cont.id}`} className="continue-card">
              <div className="row between">
                <span className="k">{data.resumed ? t("dash.continueTitle") : t("dash.startReading")}</span>
                <span className="badge">{Math.round(cont.progress)}%</span>
              </div>
              <h3>{cont.title}</h3>
              <span className="small muted">{cont.subject_name} · {cont.course_title}</span>
              <ProgressBar value={cont.progress} />
              <div className="row between" style={{ marginTop: 4 }}>
                <span className="small muted">{t("dash.continue")}</span>
                <span className="btn btn-primary btn-sm"><Play size={13} />{t("dash.continue")}</span>
              </div>
            </Link>
          ) : (
            <div className="continue-card">
              <span className="k">{t("dash.continueTitle")}</span>
              <p className="muted">{t("dash.noContinue")}</p>
            </div>
          )}
        </div>
      </section>

      <div style={{ marginBottom: 20 }}>
        <AiPromptTrigger />
      </div>

      <div className="stats">
        {stats.map((s) => (
          <div className="stat" key={s.label}>
            <span className="stat-ic"><s.icon size={18} /></span>
            <div><b>{s.v}</b><span className="muted small">{s.label}</span></div>
          </div>
        ))}
      </div>

      <div className="dash-grid">
        <div>
          <div className="section-head">
            <h2>{t("dash.recentLessons")}</h2>
          </div>
          {data.recentLessons.length ? (
            <div className="lesson-list">
              {data.recentLessons.map((l) => <LessonItem key={l.id} lesson={l} index={"•"} />)}
            </div>
          ) : (
            <div className="card"><EmptyState icon={BookOpen} title={t("course.noLessons")} text={t("course.noLessonsText")}
              action={<Link href="/lessons/new" className="btn btn-primary">{t("course.addLesson")}</Link>} /></div>
          )}
        </div>
        <div>
          <div className="section-head"><h2>{t("dash.activity")}</h2></div>
          <Activity stamps={data.activity} />
        </div>
      </div>

      {data.recentCourses.length > 0 && (
        <>
          <div className="section-head" style={{ marginTop: 28 }}>
            <h2>{t("dash.recentCourses")}</h2>
            <Link href="/library" className="link-more">{t("dash.viewAll")}<ArrowRight size={15} /></Link>
          </div>
          <div className="grid">{data.recentCourses.map((c) => <CourseCard key={c.id} course={c} />)}</div>
        </>
      )}
    </>
  );
}
