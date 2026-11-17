import { NextResponse } from "next/server";
import { ApiError, body, handler } from "@/lib/api";
import { loginUser, createSessionToken, SESSION_COOKIE, cookieOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

const attempts = new Map();
const WINDOW_MS = 5 * 60 * 1000;
const MAX_ATTEMPTS = 15;

function checkRateLimit(ip) {
  const now = Date.now();
  const entry = attempts.get(ip);
  if (!entry || now > entry.resetAt) {
    attempts.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return;
  }
  entry.count += 1;
  if (entry.count > MAX_ATTEMPTS) {
    throw new ApiError(429, "TOO_MANY_ATTEMPTS");
  }
}

export const POST = handler(async (req) => {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  checkRateLimit(ip);

  const b = await body(req);
  const user = await loginUser({
    email: b.email,
    password: b.password,
  });
  attempts.delete(ip);

  const token = createSessionToken({ uid: user.id, email: user.email });
  const res = NextResponse.json({ user });
  res.cookies.set(SESSION_COOKIE, token, cookieOptions());
  return res;
});
