import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import JSZip from "jszip";
import { getDb, UPLOAD_DIR, BACKUP_DIR } from "@/lib/db";
import { handler } from "@/lib/api";

export const dynamic = "force-dynamic";

export const GET = handler(async () => {
  const db = getDb();
  const tmp = path.join(os.tmpdir(), `summy-${Date.now()}-${Math.random().toString(16).slice(2)}.db`);
  db.exec(`VACUUM INTO '${tmp.replace(/'/g, "''")}'`);
  const zip = new JSZip();
  zip.file("manifest.json", JSON.stringify({ app: "summy", version: 1, created_at: new Date().toISOString() }));
  zip.file("summy.db", fs.readFileSync(tmp));
  fs.rmSync(tmp, { force: true });
  for (const f of fs.existsSync(UPLOAD_DIR) ? fs.readdirSync(UPLOAD_DIR) : []) {
    const p = path.join(UPLOAD_DIR, f);
    if (fs.statSync(p).isFile()) zip.file(`uploads/${f}`, fs.readFileSync(p));
  }
  const buf = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
  // keep a server-side copy too
  try {
    fs.writeFileSync(path.join(BACKUP_DIR, `summy-backup-${stamp}.zip`), buf);
  } catch {}
  return new Response(buf, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="summy-backup-${stamp}.zip"`,
    },
  });
});

