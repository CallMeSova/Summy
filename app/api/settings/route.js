import { all, run } from "@/lib/db";
import { handler, ok, body } from "@/lib/api";

export const dynamic = "force-dynamic";

const ALLOWED = {
  locale: ["th", "en"],
  theme: ["light", "dark", "system"],
  fontSize: null,
  width: ["narrow", "comfortable", "wide"],
  docFont: ["looped", "sarabun", "sans"],
};

export const GET = handler(async () =>
  ok(Object.fromEntries(all("SELECT key, value FROM settings").map((r) => [r.key, r.value])))
);

export const PUT = handler(async (req) => {
  const b = await body(req);
  for (const [k, v] of Object.entries(b)) {
    if (!(k in ALLOWED)) continue;
    const val = String(v);
    if (ALLOWED[k] && !ALLOWED[k].includes(val)) continue;
    if (k === "fontSize" && !(Number(val) >= 13 && Number(val) <= 26)) continue;
    run("INSERT INTO settings (key,value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value", k, val);
  }
  return ok({ ok: true });
});
