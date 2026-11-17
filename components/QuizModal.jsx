"use client";
import { useEffect, useState } from "react";
import { CheckCircle2, XCircle, RotateCcw, Eye, EyeOff, HelpCircle, Check } from "lucide-react";
import { Modal } from "./ui";
import { useApp } from "./Providers";
import { api } from "@/lib/client";

/**
 * Extracts a ```summy-quiz or ```quiz JSON block from Markdown source,
 * returning { quiz: { mcq: [], short: [] } | null, cleanMd: string }.
 */
export function extractQuizFromMarkdown(src) {
  if (!src || typeof src !== "string") return { quiz: null, cleanMd: src || "" };

  const regex = /```(?:summy-quiz|quiz)[ \t]*\r?\n([\s\S]*?)```/gi;
  const mcq = [];
  const short = [];
  let matched = false;

  const cleanMd = src.replace(regex, (_full, rawJson) => {
    matched = true;
    try {
      const sanitized = String(rawJson)
        .trim()
        .replace(/,\s*([\]}])/g, "$1");
      const parsed = JSON.parse(sanitized);
      if (Array.isArray(parsed?.mcq)) {
        for (const item of parsed.mcq) {
          if (item?.question && Array.isArray(item?.options) && item.options.length >= 2) {
            mcq.push({
              question: String(item.question),
              options: item.options.slice(0, 5).map(String),
              answer: Math.max(0, Math.min(item.options.length - 1, Number(item.answer) || 0)),
              explanation: String(item.explanation || ""),
            });
          }
        }
      }
      if (Array.isArray(parsed?.short)) {
        for (const item of parsed.short) {
          if (item?.question && item?.answer) {
            short.push({
              question: String(item.question),
              answer: String(item.answer),
            });
          }
        }
      }
    } catch {}
    return "";
  });

  if (!matched || (mcq.length === 0 && short.length === 0)) {
    return { quiz: null, cleanMd: src };
  }
  return {
    quiz: { mcq, short, total: mcq.length + short.length },
    cleanMd: cleanMd.trimEnd(),
  };
}

const TH_LABELS = ["ก", "ข", "ค", "ง", "จ"];
const EN_LABELS = ["A", "B", "C", "D", "E"];

export default function QuizModal({ open, onClose, quiz, lessonId, lessonTitle, onScoreSaved }) {
  const { t, locale } = useApp();
  const [tab, setTab] = useState("mcq");
  const [selected, setSelected] = useState({});
  const [checkedMcq, setCheckedMcq] = useState({});
  const [submittedAll, setSubmittedAll] = useState(false);
  const [shortInputs, setShortInputs] = useState({});
  const [revealedShort, setRevealedShort] = useState({});

  const mcq = quiz?.mcq || [];
  const short = quiz?.short || [];
  const optLabels = locale === "th" ? TH_LABELS : EN_LABELS;

  useEffect(() => {
    if (open) {
      setTab(mcq.length > 0 ? "mcq" : "short");
    }
  }, [open, mcq.length]);

  function resetQuiz() {
    setSelected({});
    setCheckedMcq({});
    setSubmittedAll(false);
    setShortInputs({});
    setRevealedShort({});
  }

  if (!open || !quiz) return null;

  const answeredCount = Object.keys(selected).length;
  const correctCount = mcq.reduce(
    (acc, q, idx) => acc + (selected[idx] === q.answer ? 1 : 0),
    0
  );

  function persistScore(score, total) {
    if (!lessonId || !total) return;
    api(`/lessons/${lessonId}/progress`, {
      method: "PUT",
      json: { quiz_score: score, quiz_total: total },
    })
      .then(() => {
        onScoreSaved?.({ quiz_score: score, quiz_total: total });
      })
      .catch(() => {});
  }

  function submitAllMcq() {
    const allChecked = {};
    mcq.forEach((_, idx) => {
      allChecked[idx] = true;
    });
    setCheckedMcq(allChecked);
    setSubmittedAll(true);
    persistScore(correctCount, mcq.length);
  }

  function checkSingleMcq(qi) {
    const next = { ...checkedMcq, [qi]: true };
    setCheckedMcq(next);
    if (mcq.length > 0 && mcq.every((_, idx) => next[idx])) {
      setSubmittedAll(true);
      persistScore(correctCount, mcq.length);
    }
  }

  function revealAllShort() {
    const allRev = {};
    short.forEach((_, idx) => {
      allRev[idx] = true;
    });
    setRevealedShort(allRev);
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`${t("quiz.title")}${lessonTitle ? ` — ${lessonTitle}` : ""}`}
      size="lg"
      footer={
        <div className="row between" style={{ width: "100%", flexWrap: "wrap" }}>
          <button type="button" className="btn btn-ghost btn-sm" onClick={resetQuiz}>
            <RotateCcw size={14} /> {t("quiz.reset")}
          </button>
          <div className="row" style={{ gap: 8 }}>
            {tab === "mcq" && mcq.length > 0 && !submittedAll && (
              <button type="button" className="btn btn-primary" onClick={submitAllMcq}>
                <Check size={15} /> {t("quiz.submitAll")}
              </button>
            )}
            {tab === "short" && short.length > 0 && (
              <button type="button" className="btn btn-secondary" onClick={revealAllShort}>
                <Eye size={15} /> {t("quiz.revealAll")}
              </button>
            )}
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              {t("common.close")}
            </button>
          </div>
        </div>
      }
    >
      <div className="stack" style={{ gap: 16 }}>
        <div className="row between" style={{ flexWrap: "wrap", gap: 10 }}>
          <div className="seg">
            {mcq.length > 0 && (
              <button
                type="button"
                className={tab === "mcq" ? "on" : ""}
                onClick={() => setTab("mcq")}
              >
                {t("quiz.tabMcq", { n: mcq.length })}
              </button>
            )}
            {short.length > 0 && (
              <button
                type="button"
                className={tab === "short" ? "on" : ""}
                onClick={() => setTab("short")}
              >
                {t("quiz.tabShort", { n: short.length })}
              </button>
            )}
          </div>

          {tab === "mcq" && mcq.length > 0 && (
            <div className="quiz-score-pill">
              {submittedAll ? (
                <b>
                  {t("quiz.score", {
                    a: correctCount,
                    b: mcq.length,
                    pct: Math.round((correctCount / mcq.length) * 100),
                  })}
                </b>
              ) : (
                <span className="muted small">
                  {t("quiz.answered", { a: answeredCount, b: mcq.length })}
                </span>
              )}
            </div>
          )}
        </div>

        {tab === "mcq" && (
          <div className="quiz-list">
            {mcq.map((q, qi) => {
              const userChoice = selected[qi];
              const isChecked = !!checkedMcq[qi] || submittedAll;
              const isCorrect = userChoice === q.answer;

              return (
                <div key={qi} className="quiz-card">
                  <div className="quiz-q">
                    <span className="quiz-num">{qi + 1}</span>
                    <div className="grow">
                      <div className="quiz-q-text">{q.question}</div>
                    </div>
                  </div>

                  <div className="quiz-options">
                    {q.options.map((opt, oi) => {
                      const picked = userChoice === oi;
                      let stateClass = "";
                      if (isChecked) {
                        if (oi === q.answer) stateClass = "correct";
                        else if (picked && oi !== q.answer) stateClass = "wrong";
                      } else if (picked) {
                        stateClass = "picked";
                      }

                      return (
                        <button
                          type="button"
                          key={oi}
                          className={`quiz-opt ${stateClass}`}
                          onClick={() => {
                            if (isChecked) return;
                            setSelected((prev) => ({ ...prev, [qi]: oi }));
                          }}
                        >
                          <span className="quiz-opt-key">{optLabels[oi] || oi + 1}</span>
                          <span className="grow">{opt}</span>
                          {isChecked && oi === q.answer && <CheckCircle2 size={16} className="ic-ok" />}
                          {isChecked && picked && oi !== q.answer && <XCircle size={16} className="ic-err" />}
                        </button>
                      );
                    })}
                  </div>

                  <div className="quiz-card-foot">
                    {!isChecked && userChoice !== undefined && (
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => checkSingleMcq(qi)}
                      >
                        <HelpCircle size={13} /> {t("quiz.checkOne")}
                      </button>
                    )}

                    {isChecked && (
                      <div className={`quiz-explain ${isCorrect ? "ok" : "err"}`}>
                        <div className="quiz-explain-head">
                          {isCorrect ? (
                            <>
                              <CheckCircle2 size={15} /> <b>{t("quiz.correct")}</b>
                            </>
                          ) : (
                            <>
                              <XCircle size={15} />{" "}
                              <b>
                                {t("quiz.wrong", {
                                  ans: `${optLabels[q.answer]}. ${q.options[q.answer]}`,
                                })}
                              </b>
                            </>
                          )}
                        </div>
                        {q.explanation && <p>{q.explanation}</p>}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {tab === "short" && (
          <div className="quiz-list">
            {short.map((q, si) => {
              const shown = !!revealedShort[si];
              return (
                <div key={si} className="quiz-card">
                  <div className="quiz-q">
                    <span className="quiz-num">{si + 1}</span>
                    <div className="grow">
                      <div className="quiz-q-text">{q.question}</div>
                    </div>
                  </div>

                  <textarea
                    className="textarea"
                    rows={3}
                    placeholder={t("quiz.shortPh")}
                    value={shortInputs[si] || ""}
                    onChange={(e) =>
                      setShortInputs((prev) => ({ ...prev, [si]: e.target.value }))
                    }
                  />

                  <div className="quiz-card-foot">
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() =>
                        setRevealedShort((prev) => ({ ...prev, [si]: !prev[si] }))
                      }
                    >
                      {shown ? <EyeOff size={14} /> : <Eye size={14} />}
                      {shown ? t("quiz.hideAnswer") : t("quiz.showAnswer")}
                    </button>

                    {shown && (
                      <div className="quiz-explain ok" style={{ marginTop: 8 }}>
                        <div className="quiz-explain-head">
                          <b>{t("quiz.modelAnswer")}</b>
                        </div>
                        <p style={{ whiteSpace: "pre-wrap" }}>{q.answer}</p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Modal>
  );
}
