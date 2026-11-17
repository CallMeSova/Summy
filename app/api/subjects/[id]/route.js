import { all, get, run, tx } from "@/lib/db";
import { handler, ok, body, str, intId, ApiError } from "@/lib/api";
import { courseSelectSql } from "@/lib/repo";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export const GET = handler(async (_req, { params }) => {
  const user = await requireUser();
  const id = intId((await params).id);
  const subject = await get("SELECT * FROM subjects WHERE id=? AND user_id=?", id, user.id);
  if (!subject) throw new ApiError(404, "Subject not found");
  const courses = await all(
    `${courseSelectSql()} WHERE c.subject_id=? AND s.user_id=? ORDER BY c.position, c.id`,
    id,
    user.id
  );
  return ok({ ...subject, courses });
});

export const PATCH = handler(async (req, { params }) => {
  const user = await requireUser();
  const id = intId((await params).id);
  const cur = await get("SELECT * FROM subjects WHERE id=? AND user_id=?", id, user.id);
  if (!cur) throw new ApiError(404, "Subject not found");
  const b = await body(req);
  const name = b.name !== undefined ? str(b.name, { field: "name", required: true, max: 120 }) : cur.name;
  const description = b.description !== undefined ? str(b.description, { max: 500 }) : cur.description;
  const color = /^#[0-9a-fA-F]{6}$/.test(b.color || "") ? b.color : cur.color;
  await run(
    "UPDATE subjects SET name=?, description=?, color=?, updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id=? AND user_id=?",
    name,
    description,
    color,
    id,
    user.id
  );
  return ok(await get("SELECT * FROM subjects WHERE id=? AND user_id=?", id, user.id));
});

export const DELETE = handler(async (_req, { params }) => {
  const user = await requireUser();
  const id = intId((await params).id);
  const cur = await get("SELECT id FROM subjects WHERE id=? AND user_id=?", id, user.id);
  if (!cur) throw new ApiError(404, "Subject not found");
  await tx(async () => {
    await run("DELETE FROM subjects WHERE id=? AND user_id=?", id, user.id);
  });
  return ok({ ok: true });
});
