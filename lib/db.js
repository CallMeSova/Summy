// SQLite via Node's built-in node:sqlite (no native build step required).
// process.getBuiltinModule keeps the bundler from trying to resolve it.
import fs from "node:fs";
import path from "node:path";

const { DatabaseSync } = process.getBuiltinModule("node:sqlite");

export const STORAGE_DIR = path.join(process.cwd(), "storage");
export const UPLOAD_DIR = path.join(STORAGE_DIR, "uploads");
export const BACKUP_DIR = path.join(STORAGE_DIR, "backups");
export const DB_PATH = path.join(STORAGE_DIR, "summy.db");

const NOW = "strftime('%Y-%m-%dT%H:%M:%fZ','now')";

const SCHEMA = `
CREATE TABLE IF NOT EXISTS subjects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  color TEXT NOT NULL DEFAULT '#0070F3',
  position INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (${NOW}),
  updated_at TEXT NOT NULL DEFAULT (${NOW})
);
CREATE TABLE IF NOT EXISTS courses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  subject_id INTEGER NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  position INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (${NOW}),
  updated_at TEXT NOT NULL DEFAULT (${NOW})
);
CREATE TABLE IF NOT EXISTS lessons (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  content_type TEXT NOT NULL CHECK (content_type IN ('richtext','markdown','pdf')),
  content_json TEXT,
  content_md TEXT,
  content_text TEXT NOT NULL DEFAULT '',
  tags TEXT NOT NULL DEFAULT '',
  position INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (${NOW}),
  updated_at TEXT NOT NULL DEFAULT (${NOW})
);
CREATE TABLE IF NOT EXISTS bookmarks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  lesson_id INTEGER NOT NULL UNIQUE REFERENCES lessons(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (${NOW})
);
CREATE TABLE IF NOT EXISTS reading_progress (
  lesson_id INTEGER PRIMARY KEY REFERENCES lessons(id) ON DELETE CASCADE,
  progress REAL NOT NULL DEFAULT 0,
  completed INTEGER NOT NULL DEFAULT 0,
  last_read_at TEXT NOT NULL DEFAULT (${NOW})
);
CREATE TABLE IF NOT EXISTS reading_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  lesson_id INTEGER NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  read_at TEXT NOT NULL DEFAULT (${NOW})
);
CREATE TABLE IF NOT EXISTS attachments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  lesson_id INTEGER NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  original_name TEXT NOT NULL,
  stored_name TEXT NOT NULL,
  mime TEXT NOT NULL,
  size INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (${NOW})
);
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_courses_subject ON courses(subject_id);
CREATE INDEX IF NOT EXISTS idx_lessons_course ON lessons(course_id);
CREATE INDEX IF NOT EXISTS idx_history_lesson ON reading_history(lesson_id);
CREATE INDEX IF NOT EXISTS idx_history_time ON reading_history(read_at);
CREATE INDEX IF NOT EXISTS idx_attach_lesson ON attachments(lesson_id);
`;

function open() {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  const db = new DatabaseSync(DB_PATH);
  db.exec("PRAGMA journal_mode = WAL;");
  db.exec("PRAGMA foreign_keys = ON;");
  db.exec(SCHEMA);
  return db;
}

export function getDb() {
  if (!globalThis.__summyDb) globalThis.__summyDb = open();
  return globalThis.__summyDb;
}

/** Close the connection (used before restoring a backup). */
export function closeDb() {
  if (globalThis.__summyDb) {
    try {
      globalThis.__summyDb.exec("PRAGMA wal_checkpoint(TRUNCATE);");
    } catch {}
    globalThis.__summyDb.close();
    globalThis.__summyDb = null;
  }
}

export const all = (sql, ...p) => getDb().prepare(sql).all(...p);
export const get = (sql, ...p) => getDb().prepare(sql).get(...p);
export const run = (sql, ...p) => getDb().prepare(sql).run(...p);

export function tx(fn) {
  const db = getDb();
  db.exec("BEGIN");
  try {
    const r = fn();
    db.exec("COMMIT");
    return r;
  } catch (e) {
    db.exec("ROLLBACK");
    throw e;
  }
}

export const nowIso = () => new Date().toISOString();

