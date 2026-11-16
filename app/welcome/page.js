"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, Languages } from "lucide-react";
import { Logo } from "@/components/Shell";
import { useApp } from "@/components/Providers";
import { api } from "@/lib/client";

export default function Welcome() {
  const { t, locale, setLocale } = useApp();
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [subject, setSubject] = useState("");
  const [course, setCourse] = useState("");
  const [subjectId, setSubjectId] = useState(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function next(e) {
    e.preventDefault();
    setErr("");
    setBusy(true);
    try {
      if (step === 1) {
        if (!subject.trim()) throw new Error(t("welcome.step1"));
        if (!subjectId) {
          const s = await api("/subjects", { method: "POST", json: { name: subject } });
          setSubjectId(s.id);
        }
        setStep(2);
      } else {
        if (!course.trim()) throw new Error(t("welcome.step2"));
        const c = await api("/courses", { method: "POST", json: { title: course, subject_id: subjectId } });
        router.replace(`/courses/${c.id}`);
      }
    } catch (e2) {
      setErr(e2.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="welcome">
      <button className="btn btn-ghost btn-sm" style={{ position: "fixed", top: 16, right: 16 }} onClick={() => setLocale(locale === "th" ? "en" : "th")}>
        <Languages size={16} /> {locale === "th" ? "English" : "ไทย"}
      </button>
      <Logo size={64} />
      <h1>{t("welcome.title")}</h1>
      <p className="muted sub">{t("welcome.subtitle")}</p>
      <div className="steps"><i className={step >= 1 ? "on" : ""} /><i className={step >= 2 ? "on" : ""} /></div>
      <form className="card" onSubmit={next}>
        {step === 1 ? (
          <div className="stack">
            <div><h3>{t("welcome.step1")}</h3><p className="muted small">{t("welcome.subjectHint")}</p></div>
            <input className={`input ${err ? "invalid" : ""}`} autoFocus value={subject} onChange={(e) => setSubject(e.target.value)} placeholder={t("welcome.sample")} maxLength={120} />
          </div>
        ) : (
          <div className="stack">
            <div className="row"><span className="chip"><Check size={12} />{subject}</span></div>
            <div><h3>{t("welcome.step2")}</h3><p className="muted small">{t("welcome.courseHint")}</p></div>
            <input className={`input ${err ? "invalid" : ""}`} autoFocus value={course} onChange={(e) => setCourse(e.target.value)} placeholder={t("welcome.sampleCourse")} maxLength={160} />
          </div>
        )}
        {err && <p className="field-error" style={{ marginTop: 8 }}>{err}</p>}
        <div className="row" style={{ justifyContent: "flex-end", marginTop: 18 }}>
          <button className="btn btn-primary btn-lg" disabled={busy}>
            {step === 1 ? t("welcome.next") : t("welcome.finish")} <ArrowRight size={18} />
          </button>
        </div>
      </form>
    </div>
  );
}

