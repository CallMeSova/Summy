import "server-only";
import fs from "node:fs";
import path from "node:path";
import { createClient } from "@libsql/client/web";

export const STORAGE_DIR = path.join(process.cwd(), "storage");
export const UPLOAD_DIR = path.join(STORAGE_DIR, "uploads");
export const BACKUP_DIR = path.join(STORAGE_DIR, "backups");
export const DB_PATH = path.join(STORAGE_DIR, "summy.db");

const NOW = "strftime('%Y-%m-%dT%H:%M:%fZ','now')";

const SCHEMA_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    google_sub TEXT UNIQUE,
    email TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL DEFAULT '',
    avatar TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (${NOW})
  )`,
  `CREATE TABLE IF NOT EXISTS subjects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL DEFAULT 1 REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    color TEXT NOT NULL DEFAULT '#0070F3',
    position INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (${NOW}),
    updated_at TEXT NOT NULL DEFAULT (${NOW})
  )`,
  `CREATE TABLE IF NOT EXISTS courses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    subject_id INTEGER NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    position INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (${NOW}),
    updated_at TEXT NOT NULL DEFAULT (${NOW})
  )`,
  `CREATE TABLE IF NOT EXISTS lessons (
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
  )`,
  `CREATE TABLE IF NOT EXISTS bookmarks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL DEFAULT 1 REFERENCES users(id) ON DELETE CASCADE,
    lesson_id INTEGER NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL DEFAULT (${NOW}),
    UNIQUE(user_id, lesson_id)
  )`,
  `CREATE TABLE IF NOT EXISTS reading_progress (
    user_id INTEGER NOT NULL DEFAULT 1 REFERENCES users(id) ON DELETE CASCADE,
    lesson_id INTEGER NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
    progress REAL NOT NULL DEFAULT 0,
    completed INTEGER NOT NULL DEFAULT 0,
    last_read_at TEXT NOT NULL DEFAULT (${NOW}),
    PRIMARY KEY (user_id, lesson_id)
  )`,
  `CREATE TABLE IF NOT EXISTS reading_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL DEFAULT 1 REFERENCES users(id) ON DELETE CASCADE,
    lesson_id INTEGER NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
    read_at TEXT NOT NULL DEFAULT (${NOW})
  )`,
  `CREATE TABLE IF NOT EXISTS attachments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lesson_id INTEGER NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
    original_name TEXT NOT NULL,
    stored_name TEXT NOT NULL,
    mime TEXT NOT NULL,
    size INTEGER NOT NULL,
    data BLOB,
    created_at TEXT NOT NULL DEFAULT (${NOW})
  )`,
  `CREATE TABLE IF NOT EXISTS user_settings (
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    key TEXT NOT NULL,
    value TEXT NOT NULL,
    PRIMARY KEY (user_id, key)
  )`,
  `CREATE INDEX IF NOT EXISTS idx_subjects_user ON subjects(user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_courses_subject ON courses(subject_id)`,
  `CREATE INDEX IF NOT EXISTS idx_lessons_course ON lessons(course_id)`,
  `CREATE INDEX IF NOT EXISTS idx_bookmarks_user ON bookmarks(user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_history_user_time ON reading_history(user_id, read_at)`,
  `CREATE INDEX IF NOT EXISTS idx_attach_lesson ON attachments(lesson_id)`,
];

function isTursoConfigured() {
  const url = process.env.TURSO_DATABASE_URL || "";
  return url.startsWith("libsql://") || url.startsWith("https://") || url.startsWith("http://");
}

function normalizeArg(v) {
  if (v === undefined) return null;
  if (Buffer.isBuffer(v)) return new Uint8Array(v.buffer, v.byteOffset, v.byteLength);
  return v;
}

/**
 * Create a Turso (@libsql/client/web) adapter with the same async methods as the local adapter.
 */
async function createTursoAdapter() {
  const client = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });

  await client.execute("PRAGMA foreign_keys = ON;");
  for (const stmt of SCHEMA_STATEMENTS) {
    await client.execute(stmt);
  }

  return {
    kind: "turso",
    async all(sql, ...params) {
      const rs = await client.execute({ sql, args: params.map(normalizeArg) });
      return rs.rows.map((r) => ({ ...r }));
    },
    async get(sql, ...params) {
      const rs = await client.execute({ sql, args: params.map(normalizeArg) });
      return rs.rows[0] ? { ...rs.rows[0] } : undefined;
    },
    async run(sql, ...params) {
      const rs = await client.execute({ sql, args: params.map(normalizeArg) });
      return {
        lastInsertRowid: rs.lastInsertRowid !== undefined ? Number(rs.lastInsertRowid) : 0,
        changes: rs.rowsAffected,
      };
    },
    async tx(fn) {
      return await fn();
    },
  };
}

/**
 * Create a local SQLite (node:sqlite) adapter for local dev when TURSO_DATABASE_URL is not set,
 * automatically migrating any pre-OAuth tables in storage/summy.db.
 */
function createLocalAdapter() {
  const { DatabaseSync } = process.getBuiltinModule("node:sqlite");
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  const db = new DatabaseSync(DB_PATH);
  db.exec("PRAGMA journal_mode = WAL;");
  db.exec("PRAGMA foreign_keys = OFF;");

  // Create users table first and ensure user #1 exists for existing local data
  db.exec(SCHEMA_STATEMENTS[0]);
  const hasUser1 = db.prepare("SELECT 1 FROM users WHERE id=1").get();
  if (!hasUser1) {
    db.prepare("INSERT INTO users (id, email, name) VALUES (1, 'local@summy.app', 'Local User')").run();
  }

  const hasCol = (table, col) => {
    const cols = db.prepare(`PRAGMA table_info(${table})`).all();
    return cols.length > 0 && cols.some((c) => c.name === col);
  };
  const tableExists = (table) =>
    !!db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name=?").get(table);

  // Migrate legacy pre-OAuth tables if they exist without user_id
  if (tableExists("subjects") && !hasCol("subjects", "user_id")) {
    db.exec("ALTER TABLE subjects ADD COLUMN user_id INTEGER NOT NULL DEFAULT 1 REFERENCES users(id) ON DELETE CASCADE;");
  }
  if (tableExists("attachments") && !hasCol("attachments", "data")) {
    db.exec("ALTER TABLE attachments ADD COLUMN data BLOB;");
  }
  if (tableExists("reading_history") && !hasCol("reading_history", "user_id")) {
    db.exec("ALTER TABLE reading_history ADD COLUMN user_id INTEGER NOT NULL DEFAULT 1 REFERENCES users(id) ON DELETE CASCADE;");
  }
  if (tableExists("bookmarks") && !hasCol("bookmarks", "user_id")) {
    db.exec(`
      CREATE TABLE bookmarks_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL DEFAULT 1 REFERENCES users(id) ON DELETE CASCADE,
        lesson_id INTEGER NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
        created_at TEXT NOT NULL DEFAULT (${NOW}),
        UNIQUE(user_id, lesson_id)
      );
      INSERT OR IGNORE INTO bookmarks_new (id, user_id, lesson_id, created_at)
        SELECT id, 1, lesson_id, created_at FROM bookmarks;
      DROP TABLE bookmarks;
      ALTER TABLE bookmarks_new RENAME TO bookmarks;
    `);
  }
  if (tableExists("reading_progress") && !hasCol("reading_progress", "user_id")) {
    db.exec(`
      CREATE TABLE reading_progress_new (
        user_id INTEGER NOT NULL DEFAULT 1 REFERENCES users(id) ON DELETE CASCADE,
        lesson_id INTEGER NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
        progress REAL NOT NULL DEFAULT 0,
        completed INTEGER NOT NULL DEFAULT 0,
        last_read_at TEXT NOT NULL DEFAULT (${NOW}),
        PRIMARY KEY (user_id, lesson_id)
      );
      INSERT OR IGNORE INTO reading_progress_new (user_id, lesson_id, progress, completed, last_read_at)
        SELECT 1, lesson_id, progress, completed, last_read_at FROM reading_progress;
      DROP TABLE reading_progress;
      ALTER TABLE reading_progress_new RENAME TO reading_progress;
    `);
  }

  for (const stmt of SCHEMA_STATEMENTS) {
    db.exec(stmt);
  }
  db.exec("PRAGMA foreign_keys = ON;");

  return {
    kind: "local",
    rawDb: db,
    async all(sql, ...params) {
      return db.prepare(sql).all(...params.map(normalizeArg));
    },
    async get(sql, ...params) {
      return db.prepare(sql).get(...params.map(normalizeArg));
    },
    async run(sql, ...params) {
      const r = db.prepare(sql).run(...params.map(normalizeArg));
      return {
        lastInsertRowid: Number(r.lastInsertRowid || 0),
        changes: Number(r.changes || 0),
      };
    },
    async tx(fn) {
      db.exec("BEGIN");
      try {
        const res = await fn();
        db.exec("COMMIT");
        return res;
      } catch (e) {
        try {
          db.exec("ROLLBACK");
        } catch {}
        throw e;
      }
    },
  };
}

export async function getAdapter() {
  if (!globalThis.__summyAdapterPromise) {
    globalThis.__summyAdapterPromise = isTursoConfigured()
      ? createTursoAdapter()
      : Promise.resolve(createLocalAdapter());
  }
  return await globalThis.__summyAdapterPromise;
}

export const all = async (sql, ...p) => (await getAdapter()).all(sql, ...p);
export const get = async (sql, ...p) => (await getAdapter()).get(sql, ...p);
export const run = async (sql, ...p) => (await getAdapter()).run(sql, ...p);
export const tx = async (fn) => (await getAdapter()).tx(fn);
export const nowIso = () => new Date().toISOString();
