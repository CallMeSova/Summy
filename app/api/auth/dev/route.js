import { NextResponse } from "next/server";
import { get, run } from "@/lib/db";
import { createSessionToken, SESSION_COOKIE, cookieOptions } from "@/lib/auth";
import { ApiError, handler } from "@/lib/api";

export const dynamic = "force-dynamic";

export const POST = handler(async () => {
  if (process.env.NODE_ENV === "production") {
    throw new ApiError(403, "Dev login is disabled in production");
  }
  let user = await get("SELECT id, email, name, avatar FROM users WHERE id=1");
  if (!user) {
    const r = await run(
      "INSERT INTO users (email, name, avatar) VALUES ('local@summy.app', 'Local Developer', '')"
    );
    user = await get("SELECT id, email, name, avatar FROM users WHERE id=?", r.lastInsertRowid);
  }
  const token = createSessionToken({ uid: user.id, email: user.email });
  const res = NextResponse.json({ user });
  res.cookies.set(SESSION_COOKIE, token, cookieOptions());
  return res;
});
