import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  getGoogleConfig,
  verifyPkceState,
  upsertGoogleUser,
  createSessionToken,
  OAUTH_STATE_COOKIE,
  SESSION_COOKIE,
  cookieOptions,
} from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const err = url.searchParams.get("error");

  if (err || !code || !state) {
    return NextResponse.redirect(new URL("/login?error=oauth_cancelled", req.url));
  }

  const c = await cookies();
  const stateCookie = c.get(OAUTH_STATE_COOKIE)?.value;
  const verifier = verifyPkceState(stateCookie, state);
  if (!verifier) {
    return NextResponse.redirect(new URL("/login?error=invalid_state", req.url));
  }

  const cfg = getGoogleConfig(req.url);
  if (!cfg.configured) {
    return NextResponse.redirect(new URL("/login?error=google_not_configured", req.url));
  }

  try {
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: cfg.clientId,
        client_secret: cfg.clientSecret,
        code,
        code_verifier: verifier,
        grant_type: "authorization_code",
        redirect_uri: cfg.redirectUri,
      }),
    });

    if (!tokenRes.ok) {
      return NextResponse.redirect(new URL("/login?error=token_exchange_failed", req.url));
    }
    const tokens = await tokenRes.json();

    const userRes = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    if (!userRes.ok) {
      return NextResponse.redirect(new URL("/login?error=userinfo_failed", req.url));
    }
    const profile = await userRes.json();
    if (!profile.sub || !profile.email || profile.email_verified === false) {
      return NextResponse.redirect(new URL("/login?error=unverified_email", req.url));
    }

    const user = await upsertGoogleUser(profile);
    const sessionToken = createSessionToken({ uid: user.id, email: user.email });

    const res = NextResponse.redirect(new URL("/", req.url));
    res.cookies.set(SESSION_COOKIE, sessionToken, cookieOptions());
    res.cookies.delete(OAUTH_STATE_COOKIE);
    return res;
  } catch (e) {
    console.error("Google OAuth callback error:", e);
    return NextResponse.redirect(new URL("/login?error=oauth_failed", req.url));
  }
}
