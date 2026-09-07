import { getDb } from '../db'

export function ensureBackupSchema(): void {
  getDb().exec(`
    CREATE TABLE IF NOT EXISTS backup_jobs (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL CHECK(type IN ('full_export', 'full_restore', 'backend_sync')),
      status TEXT NOT NULL CHECK(status IN ('pending', 'running', 'done', 'failed')),
      progress INTEGER NOT NULL DEFAULT 0,
      total INTEGER NOT NULL DEFAULT 0,
      message TEXT NOT NULL DEFAULT '',
      payload_json TEXT NOT NULL DEFAULT '{}',
      output_path TEXT,
      error TEXT,
      created_at TEXT NOT NULL,
      finished_at TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_backup_jobs_created_at
      ON backup_jobs(created_at DESC);
  `)
}
