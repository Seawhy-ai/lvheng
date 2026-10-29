import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
export function openDatabase(path) {
  const db = new DatabaseSync(path);
  db.exec('PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;');
  const exists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='users'").get();
  if (!exists) {
    db.exec('BEGIN');
    try { db.exec(readFileSync(new URL('../fastgpt-worker/migrations/0001_classroom.sql', import.meta.url), 'utf8')); db.exec('COMMIT'); }
    catch (error) { db.exec('ROLLBACK'); db.close(); throw error; }
  }
  for (const table of ['users','sessions','classes','class_members','tasks','submissions']) db.prepare(`SELECT * FROM ${table} LIMIT 0`).all();
  return {
    close: () => db.close(),
    prepare(sql) {
      const statement = db.prepare(sql);
      const wrap = (params = []) => ({
        bind: (...values) => wrap(values),
        first: async (column) => { const row = statement.get(...params); return column ? row?.[column] ?? null : row ?? null; },
        all: async () => ({ success: true, results: statement.all(...params) }),
        run: async () => { const result = statement.run(...params); return { success: true, meta: { changes: Number(result.changes), last_row_id: Number(result.lastInsertRowid) } }; }
      });
      return wrap();
    }
  };
}
