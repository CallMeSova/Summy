"use client";
import { useCallback, useEffect, useRef, useState } from "react";

export class ApiFail extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export async function api(path, { method = "GET", json, form } = {}) {
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
  if (!res.ok) throw new ApiFail(res.status, (data && data.error) || res.statusText);
  return data;
}

/** Simple data hook with reload. Pass null url to skip. */
export function useFetch(url) {
  const [state, setState] = useState({ data: null, error: null, loading: !!url });
  const seq = useRef(0);
  const load = useCallback(async () => {
    if (!url) return;
    const my = ++seq.current;
    try {
      const data = await api(url);
      if (my === seq.current) setState({ data, error: null, loading: false });
    } catch (error) {
      if (my === seq.current) setState({ data: null, error, loading: false });
    }
  }, [url]);
  useEffect(() => {
    setState((s) => ({ ...s, loading: !!url }));
    load();
  }, [load, url]);
  return { ...state, reload: load, setData: (d) => setState((s) => ({ ...s, data: d })) };
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

