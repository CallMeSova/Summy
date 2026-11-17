import fs from "node:fs";
import { get } from "@/lib/db";
import { intId, ApiError, handler } from "@/lib/api";
import { uploadPath } from "@/lib/files";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export const GET = handler(async (_req, { params }) => {
  const user = await requireUser();
  const id = intId((await params).id);
  const owned = await get(
    `SELECT l.id FROM lessons l
     JOIN courses c ON c.id=l.course_id
     JOIN subjects s ON s.id=c.subject_id
     WHERE l.id=? AND s.user_id=?`,
    id,
    user.id
  );
  if (!owned) throw new ApiError(404, "Lesson not found");

  const a = await get("SELECT * FROM attachments WHERE lesson_id=? ORDER BY id DESC LIMIT 1", id);
  if (!a) throw new ApiError(404, "No file");

  let buf = null;
  if (a.data) {
    buf = Buffer.from(a.data);
  } else if (a.stored_name) {
    const p = uploadPath(a.stored_name);
    if (fs.existsSync(p)) buf = fs.readFileSync(p);
  }
  if (!buf) throw new ApiError(404, "File is missing");

  return new Response(buf, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Length": String(buf.length),
      "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(a.original_name)}`,
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, max-age=3600",
    },
  });
});
