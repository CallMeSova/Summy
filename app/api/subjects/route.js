import { all, get, run, batch } from "@/lib/db";
import { handler, ok, body, str } from "@/lib/api";
import { nextPosition } from "@/lib/repo";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export const GET = handler(async () => {
  const user = await requireUser();
  const rows = await all(
    `SELECT s.*, (SELECT COUNT(*) FROM courses c WHERE c.subject_id=s.id) AS course_count
     FROM subjects s WHERE s.user_id=? ORDER BY s.position, s.id`,
    user.id
  );
  return ok(rows);
});

export const POST = handler(async (req) => {
  const user = await requireUser();
  const b = await body(req);
  const name = str(b.name, { field: "name", required: true, max: 120 });
  const description = str(b.description, { max: 500 });
  const color = /^#[0-9a-fA-F]{6}$/.test(b.color || "") ? b.color : "#0070F3";
  const pos = await nextPosition("subjects", "user_id", user.id);
  const r = await run(
    "INSERT INTO subjects (user_id, name, description, color, position) VALUES (?,?,?,?,?)",
    user.id,
    name,
    description,
    color,
    pos
  );
  return ok(await get("SELECT * FROM subjects WHERE id=? AND user_id=?", r.lastInsertRowid, user.id), 201);
});

/** Reorder: body { order: [id, id, ...] } */
export const PUT = handler(async (req) => {
  const user = await requireUser();
  const b = await body(req);
  const order = Array.isArray(b.order) ? b.order.slice(0, 500) : [];
  if (order.length) {
    await batch(
      order.map((id, i) => ["UPDATE subjects SET position=? WHERE id=? AND user_id=?", i, Number(id), user.id]),
      "write"
    );
  }
  return ok({ ok: true });
});
