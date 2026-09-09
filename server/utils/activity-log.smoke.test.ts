import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { afterEach, describe, expect, it } from 'vitest'

const tempDirs: string[] = []

afterEach(() => {
  while (tempDirs.length) {
    const dir = tempDirs.pop()
    if (dir) rmSync(dir, { recursive: true, force: true })
  }
  process.env.DATA_DIR = undefined
})

function useTempDataDir(): string {
  const dir = mkdtempSync(join(tmpdir(), 'pichost-smoke-'))
  tempDirs.push(dir)
  process.env.DATA_DIR = dir
  return dir
}

async function loadDbModule() {
  const mod = await import('./db')
  mod.closeDb()
  return mod
}

describe('activity log smoke', () => {
  it('migrates legacy activity_logs constraints and accepts new action types', async () => {
    const dir = useTempDataDir()
    const dbPath = join(dir, 'pichost.db')
    const legacy = new DatabaseSync(dbPath)
    legacy.exec(`
      CREATE TABLE activity_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        action TEXT NOT NULL CHECK(action IN ('upload', 'delete')),
        key TEXT NOT NULL,
        original_name TEXT NOT NULL,
        size INTEGER NOT NULL DEFAULT 0,
        content_type TEXT NOT NULL DEFAULT '',
        source TEXT NOT NULL CHECK(source IN ('web', 'api')),
        created_at TEXT NOT NULL,
        user_id INTEGER,
        backend_id TEXT,
        ip_address TEXT,
        status TEXT NOT NULL DEFAULT 'success'
      );
      INSERT INTO activity_logs (action, key, original_name, size, content_type, source, created_at)
      VALUES ('upload', 'images/a.webp', 'a.webp', 100, 'image/webp', 'web', '2026-01-01T00:00:00.000Z');
      CREATE TABLE settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `)
    legacy.close()

    const { getDb, insertActivityLog, listActivityLogs, closeDb } = await loadDbModule()
    getDb()
    const { ensureStorageSchema } = await import('./storage-backends')
    ensureStorageSchema()

    insertActivityLog({
      action: 'login',
      key: 'auth/login',
      originalName: 'admin',
      size: 0,
      contentType: '',
      source: 'web',
      userId: 1,
      ipAddress: '127.0.0.1'
    })
    insertActivityLog({
      action: 'tags',
      key: 'tags/1',
      originalName: '生活',
      size: 0,
      contentType: '',
      source: 'admin',
      userId: 1
    })

    const result = listActivityLogs({ limit: 10, page: 1 })
    expect(result.total).toBe(3)
    expect(result.items.map(item => item.action).sort()).toEqual(['login', 'tags', 'upload'])

    const migrated = getDb().prepare(`
      SELECT value FROM settings WHERE key = 'activity_logs_schema_v2'
    `).get() as { value: string } | undefined
    expect(migrated?.value).toBe('1')

    closeDb()
    await new Promise(resolve => setTimeout(resolve, 50))
  })

  it('lists activity logs on a fresh database without throwing', async () => {
    useTempDataDir()

    const { getDb, listActivityLogs, closeDb } = await loadDbModule()
    getDb()
    const { ensureStorageSchema } = await import('./storage-backends')
    ensureStorageSchema()

    const result = listActivityLogs({ limit: 5, page: 1 })
    expect(result.page).toBe(1)
    expect(result.items).toEqual([])
    closeDb()
    await new Promise(resolve => setTimeout(resolve, 50))
  })
})
