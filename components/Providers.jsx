"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { translate } from "@/lib/i18n";
import { api } from "@/lib/client";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";

const Ctx = createContext(null);
export const useApp = () => useContext(Ctx);

function setCookie(k, v) {
  document.cookie = `${k}=${encodeURIComponent(v)}; path=/; max-age=31536000; samesite=lax`;
}

export default function Providers({ initial, children }) {
  const [locale, setLocaleState] = useState(initial.locale);
  const [theme, setThemeState] = useState(initial.theme);
  const [fontSize, setFontSizeState] = useState(initial.fontSize);
  const [width, setWidthState] = useState(initial.width);
  const [docFont, setDocFontState] = useState(initial.docFont || "looped");
  const [focus, setFocus] = useState(false);
  const [toasts, setToasts] = useState([]);
  const id = useRef(0);

  const persist = useCallback((key, value) => {
    api("/settings", { method: "PUT", json: { [key]: value } }).catch(() => {});
  }, []);

  const setLocale = useCallback((v) => {
    setLocaleState(v);
    setCookie("summy_locale", v);
    document.documentElement.lang = v;
    persist("locale", v);
  }, [persist]);
  const setTheme = useCallback((v) => {
    setThemeState(v);
    setCookie("summy_theme", v);
    document.documentElement.dataset.theme = v;
    persist("theme", v);
  }, [persist]);
  const setFontSize = useCallback((v) => {
    const n = Math.max(14, Math.min(24, v));
    setFontSizeState(n);
    setCookie("summy_fs", n);
    persist("fontSize", n);
  }, [persist]);
  const setWidth = useCallback((v) => {
    setWidthState(v);
    setCookie("summy_w", v);
    persist("width", v);
  }, [persist]);
  const setDocFont = useCallback((v) => {
    setDocFontState(v);
    setCookie("summy_df", v);
    document.documentElement.dataset.docFont = v;
    persist("docFont", v);
  }, [persist]);

  useEffect(() => {
    document.documentElement.style.setProperty("--reader-size", `${fontSize}px`);
  }, [fontSize]);

  useEffect(() => {
    document.documentElement.dataset.docFont = docFont;
  }, [docFont]);

  const toast = useCallback((message, kind = "success") => {
    const tid = ++id.current;
    setToasts((l) => [...l, { id: tid, message, kind }]);
    setTimeout(() => setToasts((l) => l.filter((x) => x.id !== tid)), 3200);
  }, []);

  const t = useCallback((key, vars) => translate(locale, key, vars), [locale]);

  const value = useMemo(
    () => ({
      t,
      locale,
      setLocale,
      theme,
      setTheme,
      fontSize,
      setFontSize,
      width,
      setWidth,
      docFont,
      setDocFont,
      focus,
      setFocus,
      toast,
    }),
    [t, locale, setLocale, theme, setTheme, fontSize, setFontSize, width, setWidth, docFont, setDocFont, focus, toast]
  );

  const Icon = { success: CheckCircle2, error: AlertCircle, info: Info };
  return (
    <Ctx.Provider value={value}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {toasts.map((x) => {
          const I = Icon[x.kind] || Info;
          return (
            <div key={x.id} className={`toast toast-${x.kind}`}>
              <I size={18} />
              <span>{x.message}</span>
              <button className="icon-btn sm" onClick={() => setToasts((l) => l.filter((y) => y.id !== x.id))} aria-label="close">
                <X size={14} />
              </button>
            </div>
          );
        })}
      </div>
    </Ctx.Provider>
  );
}
