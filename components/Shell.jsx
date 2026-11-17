"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard, Library, Search, Bookmark, History, Settings, PlusCircle, Menu, Moon, Sun,
  Languages, Command, CornerDownLeft, BookOpen, FolderOpen, Monitor, LogOut,
} from "lucide-react";
import { useApp } from "./Providers";
import { api } from "@/lib/client";

export function Logo({ size = 24, height }) {
  const h = height || size;
  return (
    <span className="logo-lockup" style={{ height: h }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo.png" alt="Summy" className="logo-img" style={{ height: h, width: "auto" }} />
    </span>
  );
}

function NavItem({ href, icon: Icon, label, match }) {
  const path = usePathname();
  const active = match ? match(path) : path === href;
  return (
    <Link href={href} className={`nav-item ${active ? "active" : ""}`} aria-current={active ? "page" : undefined}>
      <Icon size={16} />
      <span>{label}</span>
    </Link>
  );
}

function Palette({ open, onClose }) {
  const { t } = useApp();
  const router = useRouter();
  const [q, setQ] = useState("");
  const [res, setRes] = useState(null);
  const [sel, setSel] = useState(0);
  const input = useRef(null);

  const pages = [
    { href: "/", label: t("nav.dashboard"), icon: LayoutDashboard },
    { href: "/library", label: t("nav.library"), icon: Library },
    { href: "/bookmarks", label: t("nav.bookmarks"), icon: Bookmark },
    { href: "/history", label: t("nav.recent"), icon: History },
    { href: "/lessons/new", label: t("nav.newLesson"), icon: PlusCircle },
    { href: "/settings", label: t("nav.settings"), icon: Settings },
  ];

  useEffect(() => {
    if (open) {
      setQ("");
      setRes(null);
      setSel(0);
      setTimeout(() => input.current?.focus(), 30);
    }
  }, [open]);

  useEffect(() => {
    if (!q.trim()) return setRes(null);
    const h = setTimeout(() => {
      api(`/search?q=${encodeURIComponent(q)}`).then(setRes).catch(() => {});
    }, 180);
    return () => clearTimeout(h);
  }, [q]);

  if (!open) return null;
  const items = q.trim()
    ? [
        ...(res?.courses || []).slice(0, 4).map((c) => ({ href: `/courses/${c.id}`, label: c.title, sub: c.subject_name, icon: FolderOpen })),
        ...(res?.lessons || []).slice(0, 6).map((l) => ({ href: `/lessons/${l.id}`, label: l.title, sub: `${l.subject_name} · ${l.course_title}`, icon: BookOpen })),
        { href: `/search?q=${encodeURIComponent(q)}`, label: `${t("search.shortcut")}: “${q}”`, icon: Search },
      ]
    : pages;

  const go = (it) => {
    onClose();
    router.push(it.href);
  };
  const onKey = (e) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setSel((s) => Math.min(items.length - 1, s + 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setSel((s) => Math.max(0, s - 1)); }
    else if (e.key === "Enter" && items[sel]) go(items[sel]);
    else if (e.key === "Escape") onClose();
  };

  return (
    <div className="overlay palette-overlay" onMouseDown={onClose}>
      <div className="palette" onMouseDown={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="palette-input">
          <Search size={17} />
          <input ref={input} value={q} onChange={(e) => { setQ(e.target.value); setSel(0); }} onKeyDown={onKey} placeholder={t("palette.placeholder")} />
          <kbd>Esc</kbd>
        </div>
        <div className="palette-list">
          {!q.trim() && <div className="palette-group">{t("palette.go")}</div>}
          {items.map((it, i) => (
            <button key={it.href + i} className={`palette-item ${i === sel ? "sel" : ""}`} onMouseEnter={() => setSel(i)} onClick={() => go(it)}>
              <it.icon size={15} />
              <span className="grow">{it.label}</span>
              {it.sub && <span className="muted small">{it.sub}</span>}
              {i === sel && <CornerDownLeft size={14} />}
            </button>
          ))}
          {q.trim() && res && !res.courses.length && !res.lessons.length && (
            <div className="palette-empty">{t("palette.empty")}</div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Shell({ children }) {
  const { user, logout, t, locale, setLocale, theme, setTheme, focus, setFocus } = useApp();
  const path = usePathname();
  const router = useRouter();
  const [drawer, setDrawer] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [palette, setPalette] = useState(false);

  useEffect(() => { setDrawer(false); }, [path]);
  useEffect(() => { if (!path.startsWith("/lessons/")) setFocus(false); }, [path, setFocus]);
  useEffect(() => {
    if (!user && path !== "/login") {
      router.replace("/login");
    }
  }, [user, path, router]);

  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPalette((p) => !p);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (path === "/login" || path === "/welcome") return <div className="welcome-root">{children}</div>;
  if (!user) return null;

  const ThemeIcon = theme === "dark" ? Moon : theme === "light" ? Sun : Monitor;
  const nextTheme = { light: "dark", dark: "system", system: "light" }[theme];
  const initialLetter = (user.name || user.email || "U")[0].toUpperCase();

  function toggleMenu() {
    if (typeof window !== "undefined" && window.innerWidth <= 1024) {
      setDrawer((d) => !d);
    } else if (focus) {
      setFocus(false);
    } else {
      setCollapsed((c) => !c);
    }
  }

  return (
    <div className={`app ${focus || collapsed ? "focus-mode" : ""}`}>
      {drawer && <div className="scrim" onClick={() => setDrawer(false)} />}
      <aside className={`sidebar ${drawer ? "open" : ""}`}>
        <div className="sidebar-top">
          <Link href="/" className="brand">
            <Logo height={22} />
            <span className="brand-badge">Docs</span>
          </Link>
        </div>

        <nav className="nav">
          <div className="nav-label">{t("nav.main")}</div>
          <div className="nav-group">
            <NavItem href="/" icon={LayoutDashboard} label={t("nav.dashboard")} />
            <NavItem href="/library" icon={Library} label={t("nav.library")} match={(p) => p.startsWith("/library") || p.startsWith("/courses")} />
            <NavItem href="/search" icon={Search} label={t("nav.search")} />
            <NavItem href="/bookmarks" icon={Bookmark} label={t("nav.bookmarks")} />
          </div>
          <div className="nav-label">{t("nav.learning")}</div>
          <div className="nav-group">
            <NavItem href="/history" icon={History} label={t("nav.recent")} />
            <NavItem href="/lessons/new" icon={PlusCircle} label={t("nav.newLesson")} />
          </div>
          <div className="nav-label">{t("nav.system")}</div>
          <div className="nav-group">
            <NavItem href="/settings" icon={Settings} label={t("nav.settings")} />
          </div>
        </nav>
        <div className="sidebar-foot">
          <div className="user-card">
            {user.avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={user.avatar} alt="" className="user-avatar" referrerPolicy="no-referrer" />
            ) : (
              <span className="user-avatar user-initial">{initialLetter}</span>
            )}
            <div className="user-info">
              <div className="user-name clamp-1">{user.name || user.email}</div>
              <div className="user-email clamp-1">{user.email}</div>
            </div>
            <button
              type="button"
              className="icon-btn sm"
              onClick={logout}
              title={t("auth.logout")}
              aria-label={t("auth.logout")}
            >
              <LogOut size={15} />
            </button>
          </div>
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <button
            type="button"
            className="icon-btn menu-btn"
            onClick={toggleMenu}
            aria-label={t("nav.menu")}
            title={t("nav.menu")}
          >
            <Menu size={18} />
          </button>
          <button type="button" className="search-trigger" onClick={() => setPalette(true)}>
            <Search size={15} />
            <span>{t("palette.placeholder")}</span>
            <kbd><Command size={10} />K</kbd>
          </button>
          <div className="topbar-actions">
            <button type="button" className="icon-btn lang-btn" onClick={() => setLocale(locale === "th" ? "en" : "th")} aria-label="Language">
              <Languages size={16} />
              <b>{locale === "th" ? "TH" : "EN"}</b>
            </button>
            <button type="button" className="icon-btn" onClick={() => setTheme(nextTheme)} aria-label={t("settings.theme")} title={t(`settings.${theme}`)}>
              <ThemeIcon size={16} />
            </button>
            <button type="button" className="btn btn-primary btn-sm hide-sm" onClick={() => router.push("/lessons/new")}>
              <PlusCircle size={15} /> {t("course.addLesson")}
            </button>
          </div>
        </header>
        <main className="content">{children}</main>
      </div>
      <Palette open={palette} onClose={() => setPalette(false)} />
    </div>
  );
}
