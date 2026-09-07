import { randomBytes } from 'node:crypto'
import { getDb } from '../db'
import { ensureBackupSchema } from './schema'

export type BackupJobType = 'full_export' | 'full_restore' | 'backend_sync'
export type BackupJobStatus = 'pending' | 'running' | 'done' | 'failed'

export interface BackupJob {
  id: string
  type: BackupJobType
  status: BackupJobStatus
  progress: number
  total: number
  message: string
  payload: Record<string, unknown>
  outputPath: string | null
  error: string | null
  createdAt: string
  finishedAt: string | null
}

interface BackupJobRow {
  id: string
  type: BackupJobType
  status: BackupJobStatus
  progress: number
  total: number
  message: string
  payload_json: string
  output_path: string | null
  error: string | null
  created_at: string
  finished_at: string | null
}

function rowToJob(row: BackupJobRow): BackupJob {
  const payload = (() => {
    try {
      return JSON.parse(row.payload_json) as Record<string, unknown>
    } catch {
      return {}
    }
  })()
  return {
    id: row.id,
    type: row.type,
    status: row.status,
    progress: row.progress,
    total: row.total,
    message: row.message,
    payload,
    outputPath: row.output_path,
    error: row.error,
    createdAt: row.created_at,
    finishedAt: row.finished_at
  }
}

function generateJobId(): string {
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\..+/, '').slice(0, 15)
  const suffix = randomBytes(3).toString('hex')
  return `${stamp}-${suffix}`
}

export function getRunningBackupJob(): BackupJob | null {
  ensureBackupSchema()
  const row = getDb().prepare(`
    SELECT id, type, status, progress, total, message, payload_json,
           output_path, error, created_at, finished_at
    FROM backup_jobs
    WHERE status = 'running'
    LIMIT 1
  `).get() as BackupJobRow | undefined
  return row ? rowToJob(row) : null
}

export function getActiveBackupJob(): BackupJob | null {
  ensureBackupSchema()
  const row = getDb().prepare(`
    SELECT id, type, status, progress, total, message, payload_json,
           output_path, error, created_at, finished_at
    FROM backup_jobs
    WHERE status IN ('pending', 'running')
    ORDER BY created_at DESC
    LIMIT 1
  `).get() as BackupJobRow | undefined
  return row ? rowToJob(row) : null
}

export function createBackupJob(input: {
  type: BackupJobType
  total?: number
  message?: string
  payload?: Record<string, unknown>
}): BackupJob {
  ensureBackupSchema()
  const id = generateJobId()
  const now = new Date().toISOString()
  const payloadJson = JSON.stringify(input.payload ?? {})

  getDb().prepare(`
    INSERT INTO backup_jobs
      (id, type, status, progress, total, message, payload_json, output_path, error, created_at, finished_at)
    VALUES (?, ?, 'pending', 0, ?, ?, ?, NULL, NULL, ?, NULL)
  `).run(
    id,
    input.type,
    input.total ?? 0,
    input.message ?? '',
    payloadJson,
    now
  )

  return getBackupJob(id)!
}

export function getBackupJob(id: string): BackupJob | null {
  ensureBackupSchema()
  const row = getDb().prepare(`
    SELECT id, type, status, progress, total, message, payload_json,
           output_path, error, created_at, finished_at
    FROM backup_jobs
    WHERE id = ?
  `).get(id) as BackupJobRow | undefined
  return row ? rowToJob(row) : null
}

export function listBackupJobs(limit = 20): BackupJob[] {
  return listBackupJobsPage(1, limit).jobs
}

export function countBackupJobs(): number {
  ensureBackupSchema()
  const row = getDb().prepare('SELECT COUNT(*) AS count FROM backup_jobs').get() as { count: number }
  return row.count
}

export function listBackupJobsPage(page = 1, pageSize = 10): { jobs: BackupJob[], total: number } {
  ensureBackupSchema()
  const limit = Math.min(50, Math.max(1, pageSize))
  const safePage = Math.max(1, page)
  const offset = (safePage - 1) * limit
  const total = countBackupJobs()
  const rows = getDb().prepare(`
    SELECT id, type, status, progress, total, message, payload_json,
           output_path, error, created_at, finished_at
    FROM backup_jobs
    ORDER BY created_at DESC
    LIMIT ? OFFSET ?
  `).all(limit, offset) as unknown as BackupJobRow[]
  return { jobs: rows.map(rowToJob), total }
}

/** Capture live task history before a full restore swaps the database file. */
export function snapshotBackupJobs(limit = 50): BackupJob[] {
  return listBackupJobs(limit)
}

/** Restore task history after the database file was replaced from a backup package. */
export function restoreBackupJobsAfterReplace(preserved: BackupJob[]): void {
  ensureBackupSchema()
  const db = getDb()
  db.exec('BEGIN')
  try {
    db.prepare('DELETE FROM backup_jobs').run()
    const insert = db.prepare(`
      INSERT INTO backup_jobs
        (id, type, status, progress, total, message, payload_json, output_path, error, created_at, finished_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    for (const job of preserved) {
      insert.run(
        job.id,
        job.type,
        job.status,
        job.progress,
        job.total,
        job.message,
        JSON.stringify(job.payload),
        job.outputPath,
        job.error,
        job.createdAt,
        job.finishedAt
      )
    }
    db.exec('COMMIT')
  } catch (error) {
    db.exec('ROLLBACK')
    throw error
  }
}

/** Mark jobs left in `running` after a crash/restart so new work can start. */
export function recoverInterruptedBackupJobs(): number {
  ensureBackupSchema()
  const finishedAt = new Date().toISOString()
  const result = getDb().prepare(`
    UPDATE backup_jobs
    SET status = 'failed',
        error = '任务中断（服务重启或异常退出）',
        message = '任务已中断，请重试',
        finished_at = ?
    WHERE status = 'running'
  `).run(finishedAt)
  return Number(result.changes ?? 0)
}

export function updateBackupJob(
  id: string,
  patch: Partial<{
    status: BackupJobStatus
    progress: number
    total: number
    message: string
    payload: Record<string, unknown>
    outputPath: string | null
    error: string | null
    finishedAt: string | null
  }>
): void {
  ensureBackupSchema()
  const current = getBackupJob(id)
  if (!current) return

  const next = {
    status: patch.status ?? current.status,
    progress: patch.progress ?? current.progress,
    total: patch.total ?? current.total,
    message: patch.message ?? current.message,
    payload: patch.payload ?? current.payload,
    outputPath: patch.outputPath !== undefined ? patch.outputPath : current.outputPath,
    error: patch.error !== undefined ? patch.error : current.error,
    finishedAt: patch.finishedAt !== undefined ? patch.finishedAt : current.finishedAt
  }

  getDb().prepare(`
    UPDATE backup_jobs
    SET status = ?, progress = ?, total = ?, message = ?, payload_json = ?,
        output_path = ?, error = ?, finished_at = ?
    WHERE id = ?
  `).run(
    next.status,
    next.progress,
    next.total,
    next.message,
    JSON.stringify(next.payload),
    next.outputPath,
    next.error,
    next.finishedAt,
    id
  )
}

export function markJobRunning(id: string, message?: string): void {
  updateBackupJob(id, {
    status: 'running',
    message: message ?? ''
  })
}

export function markJobDone(id: string, patch?: {
  message?: string
  outputPath?: string | null
  payload?: Record<string, unknown>
}): void {
  updateBackupJob(id, {
    status: 'done',
    message: patch?.message ?? '',
    outputPath: patch?.outputPath,
    payload: patch?.payload,
    finishedAt: new Date().toISOString(),
    error: null
  })
}

export function markJobFailed(id: string, error: string, message?: string): void {
  updateBackupJob(id, {
    status: 'failed',
    error,
    message: message ?? error,
    finishedAt: new Date().toISOString()
  })
}
