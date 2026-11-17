import "server-only";
import crypto from "node:crypto";
import { cookies } from "next/headers";
import { ApiError } from "./api";
import { get, run } from "./db";

export const SESSION_COOKIE = "summy_session";
export const OAUTH_STATE_COOKIE = "summy_oauth_state";
const SESSION_TTL_SEC = 60 * 60 * 24 * 30; // 30 days

function getSecret() {
  const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
  if (secret && secret.length >= 16) return secret;
  if (process.env.NODE_ENV === "production") {
    throw new Error("AUTH_SECRET environment variable (min 16 chars) is required in production");
  }
  return "summy-dev-only-secret-change-in-production-env";
}

function b64url(input) {
  return Buffer.from(input).toString("base64url");
}

function signHmac(data) {
  return crypto.createHmac("sha256", getSecret()).update(data).digest("base64url");
}

function safeEqual(a, b) {
  const bufA = Buffer.from(String(a));
  const bufB = Buffer.from(String(b));
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

export function createSessionToken(payload) {
  const exp = Math.floor(Date.now() / 1000) + SESSION_TTL_SEC;
  const body = b64url(JSON.stringify({ ...payload, exp }));
  const sig = signHmac(body);
  return `${body}.${sig}`;
}

export function verifySessionToken(token) {
  if (!token || typeof token !== "string" || !token.includes(".")) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const expected = signHmac(body);
  if (!safeEqual(sig, expected)) return null;
  try {
    const data = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    if (!data.exp || data.exp < Math.floor(Date.now() / 1000)) return null;
    if (!Number.isInteger(data.uid) || data.uid <= 0) return null;
    return data;
  } catch {
    return null;
  }
}

export function cookieOptions(maxAge = SESSION_TTL_SEC) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge,
  };
}

export function getGoogleConfig(reqUrl) {
  const clientId = process.env.GOOGLE_CLIENT_ID || process.env.AUTH_GOOGLE_ID || "";
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET || process.env.AUTH_GOOGLE_SECRET || "";
  const baseUrl =
    process.env.AUTH_URL ||
    process.env.NEXTAUTH_URL ||
    (reqUrl ? new URL(reqUrl).origin : "http://localhost:3000");
  return {
    configured: Boolean(clientId && clientSecret),
    clientId,
    clientSecret,
    redirectUri: `${baseUrl.replace(/\/$/, "")}/api/auth/callback/google`,
  };
}

export function createPkceState() {
  const state = crypto.randomBytes(24).toString("base64url");
  const verifier = crypto.randomBytes(32).toString("base64url");
  const challenge = crypto.createHash("sha256").update(verifier).digest("base64url");
  const payload = b64url(JSON.stringify({ state, verifier, exp: Date.now() + 10 * 60 * 1000 }));
  const token = `${payload}.${signHmac(payload)}`;
  return { state, verifier, challenge, cookieValue: token };
}

export function verifyPkceState(cookieValue, returnedState) {
  if (!cookieValue || !returnedState || !cookieValue.includes(".")) return null;
  const [body, sig] = cookieValue.split(".");
  if (!safeEqual(sig, signHmac(body))) return null;
  try {
    const data = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    if (Date.now() > data.exp) return null;
    if (!safeEqual(data.state, returnedState)) return null;
    return data.verifier;
  } catch {
    return null;
  }
}

export async function upsertGoogleUser({ sub, email, name, picture }) {
  const cleanEmail = String(email || "").trim().toLowerCase();
  if (!sub || !cleanEmail) throw new ApiError(400, "Invalid Google profile");
  const cleanName = String(name || cleanEmail.split("@")[0]).trim().slice(0, 120);
  const cleanAvatar = String(picture || "").trim().slice(0, 500);

  let user = await get("SELECT * FROM users WHERE google_sub=? OR email=?", String(sub), cleanEmail);
  if (user) {
    await run(
      "UPDATE users SET google_sub=?, email=?, name=?, avatar=? WHERE id=?",
      String(sub),
      cleanEmail,
      cleanName,
      cleanAvatar,
      user.id
    );
    return await get("SELECT id, email, name, avatar FROM users WHERE id=?", user.id);
  }

  // If user #1 is the initial local placeholder without a google_sub yet, bind their first Google login to user #1
  // so existing local subjects/courses seamlessly belong to them.
  const firstUser = await get("SELECT * FROM users WHERE id=1 AND google_sub IS NULL");
  if (firstUser) {
    await run(
      "UPDATE users SET google_sub=?, email=?, name=?, avatar=? WHERE id=1",
      String(sub),
      cleanEmail,
      cleanName,
      cleanAvatar
    );
    return await get("SELECT id, email, name, avatar FROM users WHERE id=1");
  }

  const r = await run(
    "INSERT INTO users (google_sub, email, name, avatar) VALUES (?,?,?,?)",
    String(sub),
    cleanEmail,
    cleanName,
    cleanAvatar
  );
  return await get("SELECT id, email, name, avatar FROM users WHERE id=?", Number(r.lastInsertRowid));
}

export async function getSessionUser() {
  const c = await cookies();
  const raw = c.get(SESSION_COOKIE)?.value;
  const data = verifySessionToken(raw);
  if (!data) return null;
  const user = await get("SELECT id, email, name, avatar FROM users WHERE id=?", data.uid);
  return user || null;
}

export async function requireUser() {
  const user = await getSessionUser();
  if (!user) throw new ApiError(401, "กรุณาเข้าสู่ระบบก่อนใช้งาน (Unauthorized)");
  return user;
}
