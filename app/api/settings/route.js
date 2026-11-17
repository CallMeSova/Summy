import { all, run } from "@/lib/db";
import { handler, ok, body } from "@/lib/api";
import { getSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

const ALLOWED = {
  locale: ["th", "en"],
  theme: ["light", "dark", "system"],
  fontSize: null,
  width: ["narrow", "comfortable", "wide"],
  docFont: ["looped", "sarabun", "sans"],
};

export const GET = handler(async () => {
  const user = await getSessionUser();
  if (!user) return ok({});
  const rows = await all("SELECT key, value FROM user_settings WHERE user_id=?", user.id);
  return ok(Object.fromEntries(rows.map((r) => [r.key, r.value])));
});

export const PUT = handler(async (req) => {
  const user = await getSessionUser();
  if (!user) return ok({ ok: true }); // cookies still persist for unauthenticated UI toggles
  const b = await body(req);
  for (const [k, v] of Object.entries(b)) {
    if (!Object.prototype.hasOwnProperty.call(ALLOWED, k)) continue;
    const val = String(v);
    if (ALLOWED[k] && !ALLOWED[k].includes(val)) continue;
    if (k === "fontSize" && !(Number(val) >= 13 && Number(val) <= 26)) continue;
    await run(
      `INSERT INTO user_settings (user_id, key, value) VALUES (?,?,?)
       ON CONFLICT(user_id, key) DO UPDATE SET value=excluded.value`,
      user.id,
      k,
      val
    );
  }
  return ok({ ok: true });
});
