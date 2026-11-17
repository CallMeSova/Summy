import { NextResponse } from "next/server";
import {
  getGoogleConfig,
  createPkceState,
  OAUTH_STATE_COOKIE,
  cookieOptions,
} from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req) {
  const cfg = getGoogleConfig(req.url);
  if (!cfg.configured) {
    const loginUrl = new URL("/login?error=google_not_configured", req.url);
    return NextResponse.redirect(loginUrl);
  }

  const { state, challenge, cookieValue } = createPkceState();
  const params = new URLSearchParams({
    client_id: cfg.clientId,
    redirect_uri: cfg.redirectUri,
    response_type: "code",
    scope: "openid email profile",
    state,
    code_challenge: challenge,
    code_challenge_method: "S256",
    prompt: "select_account",
  });

  const res = NextResponse.redirect(
    `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
  );
  res.cookies.set(OAUTH_STATE_COOKIE, cookieValue, cookieOptions(600));
  return res;
}
