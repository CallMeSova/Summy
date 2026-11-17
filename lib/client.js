"use client";
import { useCallback, useEffect, useRef, useState } from "react";

export class ApiFail extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

const CACHE_TTL_MS = 60_000; // 60s fresh window
const apiCache = new Map(); // path -> { data, ts, fresh }
const inflight = new Map(); // path -> Promise<any>
const subscribers = new Map(); // path -> Set<(data) => void>

let preloadPromise = null;
let preloadTimer = null;

function notifySubscribers(path, data) {
  const subs = subscribers.get(path);
  if (!subs) return;
  for (const fn of subs) {
    try {
      fn(data);
    } catch {}
  }
}

export function getCached(path) {
  const entry = apiCache.get(path);
  if (!entry) return null;
  return entry.data;
}

function isFresh(path) {
  const entry = apiCache.get(path);
  if (!entry || !entry.fresh) return false;
  return Date.now() - entry.ts < CACHE_TTL_MS;
}

export function setCached(path, data, fresh = true) {
  apiCache.set(path, { data, ts: Date.now(), fresh });
  notifySubscribers(path, data);
}

export function invalidateCache() {
  for (const [k, v] of apiCache.entries()) {
    v.fresh = false;
  }
}

function isPreloadCovered(path) {
  if (!path) return false;
  return (
    path === "/dashboard" ||
    path === "/subjects" ||
    path === "/courses" ||
    path === "/courses?withSubjects=1" ||
    path === "/bookmarks" ||
    /^\/courses\/\d+$/.test(path)
  );
}

async function rawFetch(path, { method = "GET", json, form } = {}) {
  const init = { method, headers: {} };
  if (json !== undefined) {
    init.headers["Content-Type"] = "application/json";
    init.body = JSON.stringify(json);
  } else if (form) {
    init.body = form;
  }
  const res = await fetch(`/api${path}`, { ...init, cache: "no-store" });
  let data = null;
  try {
    data = await res.json();
  } catch {}
  if (!res.ok) {
    if (res.status === 401 && typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
      window.location.href = "/login";
    }
    throw new ApiFail(res.status, (data && data.error) || res.statusText);
  }
  return data;
}

/**
 * Preload all lightweight metadata & text lessons in one single batched request.
 * Heavy assets (PDF slide binaries at /api/attachments/:id or >64KB lessons) are excluded.
 */
export function preloadAll({ force = false } = {}) {
  if (typeof window === "undefined") return Promise.resolve(null);
  if (!force && isFresh("/dashboard") && isFresh("/courses?withSubjects=1")) {
    return Promise.resolve(apiCache);
  }
  if (preloadPromise) return preloadPromise;

  preloadPromise = rawFetch("/preload")
    .then((res) => {
      if (res && res.entries) {
        const now = Date.now();
        for (const [k, v] of Object.entries(res.entries)) {
          apiCache.set(k, { data: v, ts: now, fresh: true });
          notifySubscribers(k, v);
        }
      }
      return apiCache;
    })
    .catch(() => null)
    .finally(() => {
      preloadPromise = null;
    });

  return preloadPromise;
}

function scheduleBackgroundPreload(delay = 350) {
  if (typeof window === "undefined") return;
  clearTimeout(preloadTimer);
  preloadTimer = setTimeout(() => {
    preloadAll({ force: true });
  }, delay);
}

/**
 * Prefetch a specific API endpoint (e.g. on hover over a lesson item) if not already cached.
 */
export function prefetchApi(path) {
  if (!path || isFresh(path) || inflight.has(path)) return;
  api(path).catch(() => {});
}

export async function api(path, { method = "GET", json, form, bypassCache = false } = {}) {
  const upper = method.toUpperCase();

  if (upper === "GET") {
    if (!bypassCache && isFresh(path)) {
      return apiCache.get(path).data;
    }
    // On cold start, if requesting a preload-covered route, hydrate everything in 1 batch request
    if (!bypassCache && apiCache.size === 0 && isPreloadCovered(path)) {
      await preloadAll();
      if (isFresh(path)) return apiCache.get(path).data;
    }
    // If a preload batch is currently in-flight and covers this path, wait for it first
    if (!bypassCache && preloadPromise && (isPreloadCovered(path) || /^\/lessons\/\d+$/.test(path))) {
      await preloadPromise;
      if (isFresh(path)) return apiCache.get(path).data;
    }
    if (inflight.has(path)) {
      return inflight.get(path);
    }
    const p = rawFetch(path)
      .then((data) => {
        setCached(path, data, true);
        return data;
      })
      .finally(() => {
        inflight.delete(path);
      });
    inflight.set(path, p);
    return p;
  }

  // Mutation (POST / PUT / PATCH / DELETE)
  const result = await rawFetch(path, { method: upper, json, form });
  if (!path.startsWith("/settings") && !path.startsWith("/auth/")) {
    invalidateCache();
    scheduleBackgroundPreload(300);
  }
  return result;
}

/**
 * SWR-enabled data hook with instant cache hydration and background revalidation.
 */
export function useFetch(url) {
  const [state, setState] = useState(() => {
    if (!url) return { data: null, error: null, loading: false };
    const cached = getCached(url);
    if (cached !== null) {
      return { data: cached, error: null, loading: false };
    }
    return { data: null, error: null, loading: true };
  });

  const seq = useRef(0);

  const load = useCallback(
    async (bypassCache = false) => {
      if (!url) return;
      const my = ++seq.current;
      try {
        const data = await api(url, { bypassCache });
        if (my === seq.current) {
          setState({ data, error: null, loading: false });
        }
      } catch (error) {
        if (my === seq.current) {
          setState((prev) => ({ data: prev.data, error, loading: false }));
        }
      }
    },
    [url]
  );

  useEffect(() => {
    if (!url) {
      setState({ data: null, error: null, loading: false });
      return;
    }

    // Subscribe to cache updates (e.g. from preloadAll or setCached)
    if (!subscribers.has(url)) subscribers.set(url, new Set());
    const sub = (newData) => {
      setState({ data: newData, error: null, loading: false });
    };
    subscribers.get(url).add(sub);

    const cached = getCached(url);
    if (cached !== null) {
      setState({ data: cached, error: null, loading: false });
      if (!isFresh(url)) {
        load(true);
      }
    } else {
      setState({ data: null, error: null, loading: true });
      load(false);
    }

    return () => {
      const set = subscribers.get(url);
      if (set) {
        set.delete(sub);
        if (set.size === 0) subscribers.delete(url);
      }
    };
  }, [url, load]);

  const reload = useCallback(() => load(true), [load]);

  const setData = useCallback(
    (updater) => {
      setState((prev) => {
        const next = typeof updater === "function" ? updater(prev.data) : updater;
        if (url && next !== undefined) {
          apiCache.set(url, { data: next, ts: Date.now(), fresh: true });
        }
        return { ...prev, data: next };
      });
    },
    [url]
  );

  return { ...state, reload, setData };
}

export function relativeTime(iso, t) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return t("time.justNow");
  if (m < 60) return t("time.minAgo", { n: m });
  const h = Math.floor(m / 60);
  if (h < 24) return t("time.hourAgo", { n: h });
  return t("time.dayAgo", { n: Math.floor(h / 24) });
}
