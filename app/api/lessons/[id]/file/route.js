import fs from "node:fs";
import { get } from "@/lib/db";
import { intId, ApiError, handler } from "@/lib/api";
import { uploadPath } from "@/lib/files";

export const dynamic = "force-dynamic";

export const GET = handler(async (_req, { params }) => {
  const id = intId((await params).id);
  const a = get("SELECT * FROM attachments WHERE lesson_id=? ORDER BY id DESC LIMIT 1", id);
  if (!a) throw new ApiError(404, "No file");
  const p = uploadPath(a.stored_name);
  if (!fs.existsSync(p)) throw new ApiError(404, "File is missing");
  const buf = fs.readFileSync(p);
  return new Response(buf, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Length": String(buf.length),
      "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(a.original_name)}`,
      "X-Content-Type-Options": "nosniff",
    },
  });
});

