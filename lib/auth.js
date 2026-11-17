import "server-only";
import crypto from "node:crypto";
import { cookies } from "next/headers";
import { ApiError } from "./api";
import { get, run } from "./db";

export const SESSION_COOKIE = "summy_session";
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

/**
 * Hash a plaintext password using scrypt with a random 16-byte salt.
 */
export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const derived = crypto.scryptSync(String(password), salt, 64).toString("hex");
  return `scrypt$${salt}$${derived}`;
}

/**
 * Verify a plaintext password against a stored scrypt hash in constant time.
 */
export function verifyPassword(password, storedHash) {
  if (!storedHash || typeof storedHash !== "string") return false;
  const parts = storedHash.split("$");
  if (parts.length !== 3 || parts[0] !== "scrypt") return false;
  const [, salt, expectedHex] = parts;
  if (!salt || !expectedHex) return false;
  try {
    const derived = crypto.scryptSync(String(password), salt, 64);
    const expected = Buffer.from(expectedHex, "hex");
    if (derived.length !== expected.length) return false;
    return crypto.timingSafeEqual(derived, expected);
  } catch {
    return false;
  }
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

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function registerUser({ name, email, password }) {
  const cleanEmail = String(email || "").trim().toLowerCase();
  if (!EMAIL_RE.test(cleanEmail) || cleanEmail.length > 180) {
    throw new ApiError(400, "INVALID_EMAIL");
  }
  const rawPass = String(password || "");
  if (rawPass.length < 6 || rawPass.length > 200) {
    throw new ApiError(400, "WEAK_PASSWORD");
  }
  const cleanName = String(name || cleanEmail.split("@")[0]).trim().slice(0, 100);
  if (!cleanName) throw new ApiError(400, "NAME_REQUIRED");

  const existing = await get("SELECT id, password_hash FROM users WHERE email=?", cleanEmail);
  if (existing && existing.password_hash) {
    throw new ApiError(409, "EMAIL_TAKEN");
  }

  const pwHash = hashPassword(rawPass);
  const r = await run(
    "INSERT INTO users (email, name, password_hash) VALUES (?,?,?)",
    cleanEmail,
    cleanName,
    pwHash
  );
  return await get("SELECT id, email, name, avatar FROM users WHERE id=?", Number(r.lastInsertRowid));
}

export async function loginUser({ email, password }) {
  const cleanEmail = String(email || "").trim().toLowerCase();
  const rawPass = String(password || "");
  if (!cleanEmail || !rawPass) {
    throw new ApiError(401, "INVALID_CREDENTIALS");
  }
  const user = await get("SELECT * FROM users WHERE email=?", cleanEmail);
  if (!user || !verifyPassword(rawPass, user.password_hash)) {
    throw new ApiError(401, "INVALID_CREDENTIALS");
  }
  return {
    id: Number(user.id),
    email: user.email,
    name: user.name,
    avatar: user.avatar || "",
  };
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
  if (!user) throw new ApiError(401, "Unauthorized");
  return user;
}
