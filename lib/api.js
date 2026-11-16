import { NextResponse } from "next/server";

export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export const ok = (data, status = 200) => NextResponse.json(data, { status });

/** Wrap a route handler so thrown ApiErrors become JSON responses. */
export function handler(fn) {
  return async (req, ctx) => {
    try {
      return await fn(req, ctx);
    } catch (e) {
      if (e instanceof ApiError) return ok({ error: e.message }, e.status);
      console.error(e);
      return ok({ error: "Internal server error" }, 500);
    }
  };
}

export async function body(req) {
  try {
    return await req.json();
  } catch {
    throw new ApiError(400, "Invalid JSON body");
  }
}

export function str(v, { field = "value", max = 200, required = false } = {}) {
  if (v === undefined || v === null) {
    if (required) throw new ApiError(400, `${field} is required`);
    return "";
  }
  const s = String(v).trim();
  if (required && !s) throw new ApiError(400, `${field} is required`);
  if (s.length > max) throw new ApiError(400, `${field} is too long`);
  return s;
}

export function intId(v, field = "id") {
  const n = Number(v);
  if (!Number.isInteger(n) || n <= 0) throw new ApiError(400, `Invalid ${field}`);
  return n;
}

