"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Languages, LogIn, UserPlus } from "lucide-react";
import { Logo } from "@/components/Shell";
import { useApp } from "@/components/Providers";
import { api } from "@/lib/client";

export default function LoginPage() {
  const { user, setUser, t, locale, setLocale } = useApp();
  const router = useRouter();
  const [mode, setMode] = useState("login"); // "login" | "register"
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (user) router.replace("/");
  }, [user, router]);

  async function submit(e) {
    e.preventDefault();
    setErr("");
    if (mode === "register" && !name.trim()) {
      setErr(t("auth.errName"));
      return;
    }
    if (!email.trim()) {
      setErr(t("auth.errEmail"));
      return;
    }
    if (!password || password.length < 6) {
      setErr(t("auth.errPasswordLen"));
      return;
    }

    setBusy(true);
    try {
      const endpoint = mode === "register" ? "/auth/register" : "/auth/login";
      const d = await api(endpoint, {
        method: "POST",
        json: { name, email, password },
      });
      setUser(d.user);
      router.replace("/");
    } catch (e2) {
      const code = e2.message || "";
      if (code === "EMAIL_TAKEN") setErr(t("auth.errEmailTaken"));
      else if (code === "INVALID_EMAIL") setErr(t("auth.errEmail"));
      else if (code === "WEAK_PASSWORD") setErr(t("auth.errPasswordLen"));
      else if (code === "TOO_MANY_ATTEMPTS") setErr(t("auth.errTooMany"));
      else setErr(t("auth.errInvalidCreds"));
      setBusy(false);
    }
  }

  return (
    <div className="welcome">
      <button
        type="button"
        className="btn btn-ghost btn-sm"
        style={{ position: "fixed", top: 16, right: 16 }}
        onClick={() => setLocale(locale === "th" ? "en" : "th")}
      >
        <Languages size={16} /> {locale === "th" ? "English" : "ไทย"}
      </button>

      <Logo size={48} />
      <h1>{mode === "register" ? t("auth.registerTitle") : t("auth.title")}</h1>
      <p className="muted sub">{t("auth.subtitle")}</p>

      <form className="card stack" style={{ gap: 16 }} onSubmit={submit} noValidate>
        <div className="seg" style={{ width: "100%" }}>
          <button
            type="button"
            className={mode === "login" ? "on" : ""}
            style={{ flex: 1, justifyContent: "center" }}
            onClick={() => { setMode("login"); setErr(""); }}
          >
            <LogIn size={14} /> {t("auth.tabLogin")}
          </button>
          <button
            type="button"
            className={mode === "register" ? "on" : ""}
            style={{ flex: 1, justifyContent: "center" }}
            onClick={() => { setMode("register"); setErr(""); }}
          >
            <UserPlus size={14} /> {t("auth.tabRegister")}
          </button>
        </div>

        {err && <div className="auth-alert">{err}</div>}

        {mode === "register" && (
          <div className="field">
            <label htmlFor="auth-name">{t("auth.name")}</label>
            <input
              id="auth-name"
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("auth.namePh")}
              maxLength={100}
              autoFocus
            />
          </div>
        )}

        <div className="field">
          <label htmlFor="auth-email">{t("auth.email")}</label>
          <input
            id="auth-email"
            type="email"
            className="input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
            autoFocus={mode === "login"}
          />
        </div>

        <div className="field">
          <label htmlFor="auth-pass">{t("auth.password")}</label>
          <input
            id="auth-pass"
            type="password"
            className="input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t("auth.passwordPh")}
            autoComplete={mode === "register" ? "new-password" : "current-password"}
          />
        </div>

        <button className="btn btn-primary btn-lg" style={{ width: "100%", marginTop: 4 }} disabled={busy}>
          {busy
            ? t("common.loading")
            : mode === "register"
            ? t("auth.submitRegister")
            : t("auth.submitLogin")}
        </button>
      </form>
    </div>
  );
}
