import { all, get, run } from "@/lib/db";
import { handler, ok, body, str } from "@/lib/api";
import { nextPosition } from "@/lib/repo";

export const dynamic = "force-dynamic";

export const GET = handler(async () => {
  const rows = all(`
    SELECT s.*, (SELECT COUNT(*) FROM courses c WHERE c.subject_id=s.id) AS course_count
    FROM subjects s ORDER BY s.position, s.id`);
  return ok(rows);
});

export const POST = handler(async (req) => {
  const b = await body(req);
  const name = str(b.name, { field: "name", required: true, max: 120 });
  const description = str(b.description, { max: 500 });
  const color = /^#[0-9a-fA-F]{6}$/.test(b.color || "") ? b.color : "#0070F3";
  const r = run(
    "INSERT INTO subjects (name, description, color, position) VALUES (?,?,?,?)",
    name, description, color, nextPosition("subjects")
  );
  return ok(get("SELECT * FROM subjects WHERE id=?", r.lastInsertRowid), 201);
});

/** Reorder: body { order: [id, id, ...] } */
export const PUT = handler(async (req) => {
  const b = await body(req);
  const order = Array.isArray(b.order) ? b.order : [];
  order.forEach((id, i) => run("UPDATE subjects SET position=? WHERE id=?", i, Number(id)));
  return ok({ ok: true });
});

