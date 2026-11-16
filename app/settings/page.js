"use client";
import { useRef, useState } from "react";
import { Sun, Moon, Monitor, Download, Upload, Palette, BookOpenText, Database, Info } from "lucide-react";
import { useApp } from "@/components/Providers";
import { api } from "@/lib/client";
import { PageHeader, ConfirmDialog } from "@/components/ui";

export default function Settings() {
  const { t, locale, setLocale, theme, setTheme, fontSize, setFontSize, width, setWidth, docFont, setDocFont, toast } = useApp();
  const fileRef = useRef(null);
  const [picked, setPicked] = useState(null);
  const [busy, setBusy] = useState(false);
  const [exporting, setExporting] = useState(false);

  async function exportBackup() {
    setExporting(true);
    try {
      const res = await fetch("/api/backup", { cache: "no-store" });
      if (!res.ok) throw new Error(res.statusText);
      const blob = await res.blob();
      const cd = res.headers.get("Content-Disposition") || "";
      const name = (cd.match(/filename="([^"]+)"/) || [])[1] || "summy-backup.zip";
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = name;
      a.click();
      URL.revokeObjectURL(a.href);
      toast(t("settings.exported"));
    } catch (e) {
      toast(e.message, "error");
    }
    setExporting(false);
  }

  async function restore() {
    setBusy(true);
    try {
      const form = new FormData();
      form.append("file", picked);
      await api("/backup/restore", { method: "POST", form });
      toast(t("settings.restoreDone"));
      setPicked(null);
      setTimeout(() => (window.location.href = "/"), 700);
    } catch (e) {
      toast(e.message, "error");
      setPicked(null);
    }
    setBusy(false);
  }

  return (
    <>
      <PageHeader title={t("settings.title")} subtitle={t("settings.subtitle")} />
      <div className="settings-grid">
        <section className="card settings-sec">
          <h2><Palette size={18} />{t("settings.appearance")}</h2>
          <div className="set-row">
            <div className="l"><b>{t("settings.theme")}</b></div>
            <div className="seg">
              {[["light", Sun], ["dark", Moon], ["system", Monitor]].map(([k, I]) => (
                <button key={k} className={theme === k ? "on" : ""} onClick={() => setTheme(k)}><I size={14} />{t(`settings.${k}`)}</button>
              ))}
            </div>
          </div>
          <div className="set-row">
            <div className="l"><b>{t("settings.language")}</b></div>
            <div className="seg">
              <button className={locale === "th" ? "on" : ""} onClick={() => setLocale("th")}>ไทย</button>
              <button className={locale === "en" ? "on" : ""} onClick={() => setLocale("en")}>English</button>
            </div>
          </div>
        </section>

        <section className="card settings-sec">
          <h2><BookOpenText size={18} />{t("settings.reading")}</h2>
          <div className="set-row">
            <div className="l">
              <b>{t("settings.docFont")}</b>
              <span>{t("settings.docFontHint")}</span>
            </div>
            <div className="seg">
              {["looped", "sarabun", "sans"].map((f) => (
                <button key={f} className={docFont === f ? "on" : ""} onClick={() => setDocFont(f)}>
                  {t(`font.${f}`)}
                </button>
              ))}
            </div>
          </div>
          <div className="set-row">
            <div className="l"><b>{t("settings.fontSize")}</b></div>
            <div className="range">
              <input type="range" min={14} max={24} value={fontSize} onChange={(e) => setFontSize(Number(e.target.value))} />
              <b style={{ minWidth: 42 }}>{fontSize}px</b>
            </div>
          </div>
          <div className="set-row">
            <div className="l"><b>{t("settings.readingWidth")}</b></div>
            <div className="seg">
              {["narrow", "comfortable", "wide"].map((w) => (
                <button key={w} className={width === w ? "on" : ""} onClick={() => setWidth(w)}>{t(`reader.${w}`)}</button>
              ))}
            </div>
          </div>
          <div className="preview-box">
            <div className="small muted" style={{ marginBottom: 6 }}>{t("settings.preview")}</div>
            <div className="prose" style={{ maxWidth: { narrow: 520, comfortable: 680, wide: 860 }[width] }}><p style={{ margin: 0 }}>{t("settings.previewText")}</p></div>
          </div>
        </section>

        <section className="card settings-sec">
          <h2><Database size={18} />{t("settings.data")}</h2>
          <div className="set-row">
            <div className="l"><b>{t("settings.export")}</b><span>{t("settings.exportText")}</span></div>
            <button className="btn btn-secondary" disabled={exporting} onClick={exportBackup}><Download size={15} />{exporting ? t("common.loading") : t("settings.exportBtn")}</button>
          </div>
          <div className="set-row">
            <div className="l"><b>{t("settings.restore")}</b><span>{t("settings.restoreText")}</span></div>
            <button className="btn btn-secondary" onClick={() => fileRef.current?.click()}><Upload size={15} />{t("settings.restoreBtn")}</button>
            <input ref={fileRef} type="file" accept=".zip,application/zip" hidden onChange={(e) => { setPicked(e.target.files?.[0] || null); e.target.value = ""; }} />
          </div>
        </section>

        <section className="card settings-sec">
          <h2><Info size={18} />{t("settings.about")}</h2>
          <p className="muted">{t("settings.aboutText")}</p>
          <p className="small muted" style={{ marginTop: 10 }}>{t("settings.version")} 0.1.0 · {t("settings.storage")}</p>
        </section>
      </div>

      <ConfirmDialog open={!!picked} busy={busy} title={t("settings.restoreTitle", { file: picked?.name || "" })}
        text={t("settings.restoreWarn")} confirmLabel={t("settings.restoreBtn")} onConfirm={restore} onClose={() => setPicked(null)} />
    </>
  );
}
