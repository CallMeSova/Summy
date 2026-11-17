import { NextResponse } from "next/server";
import { body, handler } from "@/lib/api";
import { registerUser, createSessionToken, SESSION_COOKIE, cookieOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

export const POST = handler(async (req) => {
  const b = await body(req);
  const user = await registerUser({
    name: b.name,
    email: b.email,
    password: b.password,
  });
  const token = createSessionToken({ uid: user.id, email: user.email });
  const res = NextResponse.json({ user }, { status: 201 });
  res.cookies.set(SESSION_COOKIE, token, cookieOptions());
  return res;
});
