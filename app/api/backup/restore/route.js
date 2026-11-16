import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import JSZip from "jszip";
import { closeDb, getDb, DB_PATH, UPLOAD_DIR, BACKUP_DIR } from "@/lib/db";
import { handler, ok, ApiError } from "@/lib/api";

export const dynamic = "force-dynamic";

const REQUIRED_TABLES = ["subjects", "courses", "lessons", "bookmarks", "reading_progress", "attachments"];
const MAX_BACKUP = 1024 * 1024 * 1024;

export const POST = handler(async (req) => {
  const fd = await req.formData();
  const file = fd.get("file");
  if (!file || typeof file === "string") throw new ApiError(400, "Backup file is required");
  if (file.size > MAX_BACKUP) throw new ApiError(413, "Backup is too large");

  let zip;
  try {
    zip = await JSZip.loadAsync(Buffer.from(await file.arrayBuffer()));
  } catch {
    throw new ApiError(400, "Not a valid ZIP file");
  }
  const manifestFile = zip.file("manifest.json");
  const dbFile = zip.file("summy.db");
  if (!manifestFile || !dbFile) throw new ApiError(400, "Not a Summy backup");
  let manifest;
  try {
    manifest = JSON.parse(await manifestFile.async("string"));
  } catch {
    throw new ApiError(400, "Corrupt manifest");
  }
  if (manifest.app !== "summy") throw new ApiError(400, "Not a Summy backup");

  const dbBuf = await dbFile.async("nodebuffer");
  if (dbBuf.subarray(0, 15).toString("latin1") !== "SQLite format 3") {
    throw new ApiError(400, "Database in backup is invalid");
  }

  // validate in a temp database before touching the live one
  const tmp = path.join(os.tmpdir(), `summy-restore-${Date.now()}.db`);
  fs.writeFileSync(tmp, dbBuf);
  try {
    const { DatabaseSync } = process.getBuiltinModule("node:sqlite");
    const t = new DatabaseSync(tmp);
    try {
      const names = t.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map((r) => r.name);
      for (const n of REQUIRED_TABLES) if (!names.includes(n)) throw new ApiError(400, "Backup schema is invalid");
      const chk = t.prepare("PRAGMA integrity_check").get();
      if (Object.values(chk)[0] !== "ok") throw new ApiError(400, "Backup database is corrupted");
    } finally {
      t.close();
    }
  } catch (e) {
    fs.rmSync(tmp, { force: true });
    if (e instanceof ApiError) throw e;
    throw new ApiError(400, "Backup database cannot be read");
  }

  // snapshot current data first so a failed restore can be recovered by hand
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
  const safety = path.join(BACKUP_DIR, `pre-restore-${stamp}.db`);
  try {
    getDb().exec(`VACUUM INTO '${safety.replace(/'/g, "''")}'`);
  } catch {}

  closeDb();
  for (const ext of ["", "-wal", "-shm"]) fs.rmSync(DB_PATH + ext, { force: true });
  fs.copyFileSync(tmp, DB_PATH);
  fs.rmSync(tmp, { force: true });

  fs.rmSync(UPLOAD_DIR, { recursive: true, force: true });
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  for (const [name, entry] of Object.entries(zip.files)) {
    if (entry.dir || !name.startsWith("uploads/")) continue;
    const base = path.basename(name);
    if (!base || base !== name.slice("uploads/".length)) continue; // no nested/traversal paths
    fs.writeFileSync(path.join(UPLOAD_DIR, base), await entry.async("nodebuffer"));
  }
  getDb(); // reopen
  return ok({ ok: true });
});

