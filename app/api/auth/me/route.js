import { handler, ok } from "@/lib/api";
import { getSessionUser, getGoogleConfig } from "@/lib/auth";

export const dynamic = "force-dynamic";

export const GET = handler(async (req) => {
  const user = await getSessionUser();
  const cfg = getGoogleConfig(req.url);
  return ok({
    user,
    googleConfigured: cfg.configured,
    devLoginAvailable: process.env.NODE_ENV !== "production",
  });
});
