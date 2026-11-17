"use client";
import { useMemo, useState } from "react";
import { Copy, Check, SlidersHorizontal, Sparkles, GitBranch, ClipboardCheck } from "lucide-react";
import { Modal } from "./ui";
import { useApp } from "./Providers";
import { buildPdfToMdPrompt } from "@/lib/aiPrompt";

async function copyText(text) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const ta = document.createElement("textarea");
  ta.value = text;
  ta.style.position = "fixed";
  ta.style.opacity = "0";
  document.body.appendChild(ta);
  ta.select();
  document.execCommand("copy");
  document.body.removeChild(ta);
}

export default function AiPromptTrigger({ onInsertSample, onInsertQuizSample, compact = false }) {
  const { t, locale, toast } = useApp();
  const [copied, setCopied] = useState(false);
  const [open, setOpen] = useState(false);
  const [outputLang, setOutputLang] = useState(locale === "en" ? "en" : "th");
  const [detailLevel, setDetailLevel] = useState("complete");
  const [includeMermaid, setIncludeMermaid] = useState(true);
  const [citePages, setCitePages] = useState(true);
  const [includeQuiz, setIncludeQuiz] = useState(true);

  const promptText = useMemo(
    () =>
      buildPdfToMdPrompt({
        outputLang,
        detailLevel,
        includeMermaid,
        citePages,
        includeQuiz,
      }),
    [outputLang, detailLevel, includeMermaid, citePages, includeQuiz]
  );

  async function handleCopy() {
    await copyText(promptText);
    setCopied(true);
    toast(t("prompt.copied"));
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <>
      <div className="prompt-bar">
        <div className="prompt-bar-info">
          <span className="prompt-badge">
            <Sparkles size={13} /> AI PDF → MD
          </span>
          {!compact && <span className="muted small">{t("prompt.barHint")}</span>}
          <label className="prompt-check">
            <input
              type="checkbox"
              checked={includeQuiz}
              onChange={(e) => setIncludeQuiz(e.target.checked)}
            />
            <span>{t("prompt.includeQuizCheck")}</span>
          </label>
        </div>
        <div className="row" style={{ gap: 6, flexWrap: "wrap" }}>
          <button type="button" className="btn btn-primary btn-sm" onClick={handleCopy}>
            {copied ? <Check size={14} /> : <Copy size={14} />}
            {copied ? t("prompt.copiedBtn") : t("prompt.copyBtn")}
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => setOpen(true)}
            title={t("prompt.customizeBtn")}
          >
            <SlidersHorizontal size={14} />
            {t("prompt.customizeBtn")}
          </button>
          {onInsertSample && (
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={onInsertSample}
              title={t("prompt.insertMermaid")}
            >
              <GitBranch size={14} />
              {t("prompt.insertMermaid")}
            </button>
          )}
          {onInsertQuizSample && (
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={onInsertQuizSample}
              title={t("prompt.insertQuiz")}
            >
              <ClipboardCheck size={14} />
              {t("prompt.insertQuiz")}
            </button>
          )}
        </div>
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={t("prompt.modalTitle")}
        size="lg"
        footer={
          <>
            <button type="button" className="btn btn-ghost" onClick={() => setOpen(false)}>
              {t("common.close")}
            </button>
            <button type="button" className="btn btn-primary" onClick={handleCopy}>
              {copied ? <Check size={15} /> : <Copy size={15} />}
              {copied ? t("prompt.copiedBtn") : t("prompt.copyBtn")}
            </button>
          </>
        }
      >
        <div className="stack" style={{ gap: 14 }}>
          <p className="muted small">{t("prompt.modalSubtitle")}</p>
          <div className="prompt-options">
            <div className="prompt-opt-row">
              <span>{t("prompt.optLang")}</span>
              <div className="seg">
                <button
                  type="button"
                  className={outputLang === "th" ? "on" : ""}
                  onClick={() => setOutputLang("th")}
                >
                  {t("prompt.optLangTh")}
                </button>
                <button
                  type="button"
                  className={outputLang === "en" ? "on" : ""}
                  onClick={() => setOutputLang("en")}
                >
                  English
                </button>
              </div>
            </div>

            <div className="prompt-opt-row">
              <span>{t("prompt.optDetail")}</span>
              <div className="seg">
                <button
                  type="button"
                  className={detailLevel === "complete" ? "on" : ""}
                  onClick={() => setDetailLevel("complete")}
                >
                  {t("prompt.optDetailFull")}
                </button>
                <button
                  type="button"
                  className={detailLevel === "exam" ? "on" : ""}
                  onClick={() => setDetailLevel("exam")}
                >
                  {t("prompt.optDetailExam")}
                </button>
              </div>
            </div>

            <div className="prompt-opt-row">
              <span>{t("prompt.optQuiz")}</span>
              <div className="seg">
                <button
                  type="button"
                  className={includeQuiz ? "on" : ""}
                  onClick={() => setIncludeQuiz(true)}
                >
                  {t("prompt.on")}
                </button>
                <button
                  type="button"
                  className={!includeQuiz ? "on" : ""}
                  onClick={() => setIncludeQuiz(false)}
                >
                  {t("prompt.off")}
                </button>
              </div>
            </div>

            <div className="prompt-opt-row">
              <span>{t("prompt.optMermaid")}</span>
              <div className="seg">
                <button
                  type="button"
                  className={includeMermaid ? "on" : ""}
                  onClick={() => setIncludeMermaid(true)}
                >
                  {t("prompt.on")}
                </button>
                <button
                  type="button"
                  className={!includeMermaid ? "on" : ""}
                  onClick={() => setIncludeMermaid(false)}
                >
                  {t("prompt.off")}
                </button>
              </div>
            </div>

            <div className="prompt-opt-row">
              <span>{t("prompt.optCite")}</span>
              <div className="seg">
                <button
                  type="button"
                  className={citePages ? "on" : ""}
                  onClick={() => setCitePages(true)}
                >
                  {t("prompt.on")}
                </button>
                <button
                  type="button"
                  className={!citePages ? "on" : ""}
                  onClick={() => setCitePages(false)}
                >
                  {t("prompt.off")}
                </button>
              </div>
            </div>
          </div>

          <div className="field">
            <label>{t("prompt.previewLabel")}</label>
            <textarea
              className="textarea prompt-textarea"
              value={promptText}
              readOnly
              rows={12}
              onClick={(e) => e.currentTarget.select()}
            />
          </div>
        </div>
      </Modal>
    </>
  );
}
