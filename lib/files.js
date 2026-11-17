import "server-only";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { UPLOAD_DIR } from "./db";

export const MAX_PDF_BYTES = 20 * 1024 * 1024; // 20 MB

export function safeStoredName(ext = ".pdf") {
  return `${Date.now()}-${crypto.randomBytes(8).toString("hex")}${ext}`;
}

/** Resolve a stored name inside UPLOAD_DIR, refusing any traversal. */
export function uploadPath(storedName) {
  return path.join(UPLOAD_DIR, path.basename(String(storedName || "")));
}

export function removeLessonFiles(rows) {
  for (const r of rows || []) {
    if (!r?.stored_name) continue;
    try {
      fs.unlinkSync(uploadPath(r.stored_name));
    } catch {}
  }
}

export function isPdf(buf) {
  return buf.length > 4 && buf.subarray(0, 5).toString("latin1") === "%PDF-";
}
