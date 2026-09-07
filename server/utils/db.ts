import { DatabaseSync } from 'node:sqlite'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { getDataDir } from './data-dir'
import { logException } from './logger'

export type LogAction = 'upload' | 'delete'
export type LogSource = 'web' | 'api'

export interface ActivityLogRow {
  id: number
  action: LogAction
  key: string
  original_name: string
  size: number
  content_type: string
  source: LogSource
  user_id: number | null
  username: string | null
  backend_id: string | null
  backend_name: string | null
  backend_type: string | null
  created_at: string
}

export interface ActivityLogInput {
  action: LogAction
  key: string
  originalName: string
  size: number
  contentType: string
  source: LogSource
  userId?: number | null
  backendId?: string | null
  createdAt?: string
}

let db: DatabaseSync | null = null
let dbReplacing = false

export function isDbReplacing(): boolean {
  return dbReplacing
}

export function setDbReplacing(value: boolean): void {
  dbReplacing = value
}

export function closeDb(): void {
  if (db) {
    db.close()
    db = null
  }
}

export function getDb(): DatabaseSync {
  if (dbReplacing) {
    throw new Error('DATABASE_REPLACE_IN_PROGRESS')
  }
  if (db) return db

  const dataDir = getDataDir()
  mkdirSync(dataDir, { recursive: true })
  const path = join(dataDir, 'pichost.db')
  db = new DatabaseSync(path)
  db.exec(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS activity_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      action TEXT NOT NULL CHECK(action IN ('upload', 'delete')),
      key TEXT NOT NULL,
      original_name TEXT NOT NULL,
      size INTEGER NOT NULL DEFAULT 0,
      content_type TEXT NOT NULL DEFAULT '',
      source TEXT NOT NULL CHECK(source IN ('web', 'api')),
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at
      ON activity_logs(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_activity_logs_action_created
      ON activity_logs(action, created_at DESC);
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('admin', 'user')),
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL,
      token_hash TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);
  `)
  migrateSchema(db)
  return db
}

function migrateSchema(database: DatabaseSync): void {
  const columns = database.prepare('PRAGMA table_info(users)').all() as Array<{
    name: string
  }>
  if (!columns.some(column => column.name === 'api_token')) {
    database.exec('ALTER TABLE users ADD COLUMN api_token TEXT')
    database.exec(
      'CREATE UNIQUE INDEX IF NOT EXISTS idx_users_api_token ON users(api_token) WHERE api_token IS NOT NULL'
    )
  }
  if (!columns.some(column => column.name === 'auto_delete_days')) {
    database.exec('ALTER TABLE users ADD COLUMN auto_delete_days INTEGER NOT NULL DEFAULT 0')
  }
  const userColumns = database.prepare('PRAGMA table_info(users)').all() as Array<{
    name: string
  }>
  if (!userColumns.some(column => column.name === 'auto_delete_enabled_at')) {
    database.exec('ALTER TABLE users ADD COLUMN auto_delete_enabled_at TEXT')
    database.exec(`
      UPDATE users
      SET auto_delete_enabled_at = datetime('now')
      WHERE auto_delete_days > 0 AND auto_delete_enabled_at IS NULL
    `)
  }

  const daysRow = database.prepare(`
    SELECT value FROM settings WHERE key = 'auto_delete_days'
  `).get() as { value: string } | undefined
  const enabledAtRow = database.prepare(`
    SELECT value FROM settings WHERE key = 'auto_delete_enabled_at'
  `).get() as { value: string } | undefined
  const globalDays = daysRow ? Number(daysRow.value) : 0
  if (globalDays > 0 && !enabledAtRow) {
    const now = new Date().toISOString()
    database.prepare(`
      INSERT INTO settings (key, value, updated_at)
      VALUES ('auto_delete_enabled_at', ?, ?)
    `).run(now, now)
  }

  const logColumns = database.prepare('PRAGMA table_info(activity_logs)').all() as Array<{
    name: string
  }>
  if (!logColumns.some(column => column.name === 'user_id')) {
    database.exec('ALTER TABLE activity_logs ADD COLUMN user_id INTEGER')
    database.exec(`
      CREATE INDEX IF NOT EXISTS idx_activity_logs_user_created
        ON activity_logs(user_id, created_at DESC)
    `)
  }
  const activityLogColumns = database.prepare('PRAGMA table_info(activity_logs)').all() as Array<{
    name: string
  }>
  if (!activityLogColumns.some(column => column.name === 'backend_id')) {
    database.exec('ALTER TABLE activity_logs ADD COLUMN backend_id TEXT')
  }

  database.exec(`
    UPDATE activity_logs SET source = 'api' WHERE source = 'twikoo'
  `)
}

const USER_COLUMNS = 'id, username, password_hash, role, created_at, api_token, auto_delete_days, auto_delete_enabled_at'

export type UserRole = 'admin' | 'user'

export interface UserRow {
  id: number
  username: string
  password_hash: string
  role: UserRole
  created_at: string
  api_token: string | null
  auto_delete_days: number
  auto_delete_enabled_at: string | null
}

export interface AutoDeletePolicy {
  days: number
  enabledAt: string | null
}

export interface SessionRow {
  id: string
  user_id: number
  token_hash: string
  expires_at: string
  created_at: string
}

export function countUsers(): number {
  const row = getDb().prepare('SELECT COUNT(*) AS count FROM users').get() as {
    count: number
  }
  return row.count
}

export function listUserIdUsernameMap(): Map<number, string> {
  const rows = getDb().prepare(`
    SELECT id, username
    FROM users
  `).all() as Array<{ id: number, username: string }>

  return new Map(rows.map(row => [row.id, row.username]))
}

export function findUserById(id: number): UserRow | null {
  const row = getDb().prepare(`
    SELECT ${USER_COLUMNS}
    FROM users
    WHERE id = ?
  `).get(id) as UserRow | undefined
  return row ?? null
}

export function findUserByUsername(username: string): UserRow | null {
  const row = getDb().prepare(`
    SELECT ${USER_COLUMNS}
    FROM users
    WHERE username = ?
  `).get(username) as UserRow | undefined
  return row ?? null
}

export function findUserByApiToken(token: string): UserRow | null {
  if (!token) return null
  const row = getDb().prepare(`
    SELECT ${USER_COLUMNS}
    FROM users
    WHERE api_token = ?
  `).get(token) as UserRow | undefined
  return row ?? null
}

export function getUserApiToken(userId: number): string | null {
  const row = getDb().prepare(`
    SELECT api_token
    FROM users
    WHERE id = ?
  `).get(userId) as { api_token: string | null } | undefined
  return row?.api_token ?? null
}

export function setUserApiToken(userId: number, token: string): void {
  getDb().prepare(`
    UPDATE users
    SET api_token = ?
    WHERE id = ?
  `).run(token, userId)
}

export function getUserAutoDeletePolicy(userId: number): AutoDeletePolicy {
  const row = getDb().prepare(`
    SELECT auto_delete_days, auto_delete_enabled_at
    FROM users
    WHERE id = ?
  `).get(userId) as { auto_delete_days: number, auto_delete_enabled_at: string | null } | undefined

  return {
    days: row?.auto_delete_days ?? 0,
    enabledAt: row?.auto_delete_enabled_at ?? null
  }
}

export function getUserAutoDeleteDays(userId: number): number {
  return getUserAutoDeletePolicy(userId).days
}

export function setUserAutoDeletePolicy(userId: number, days: number): void {
  const current = getUserAutoDeletePolicy(userId)
  const now = new Date().toISOString()
  let enabledAt = current.enabledAt

  if (days > 0 && current.days === 0) {
    enabledAt = now
  } else if (days === 0) {
    enabledAt = null
  }

  getDb().prepare(`
    UPDATE users
    SET auto_delete_days = ?, auto_delete_enabled_at = ?
    WHERE id = ?
  `).run(days, enabledAt, userId)
}

export function listUserAutoDeletePolicies(): Map<number, AutoDeletePolicy> {
  const rows = getDb().prepare(`
    SELECT id, auto_delete_days, auto_delete_enabled_at
    FROM users
    WHERE auto_delete_days > 0
  `).all() as Array<{
    id: number
    auto_delete_days: number
    auto_delete_enabled_at: string | null
  }>

  return new Map(rows.map(row => [
    row.id,
    { days: row.auto_delete_days, enabledAt: row.auto_delete_enabled_at }
  ]))
}

export function listAdminUserIds(): Set<number> {
  const rows = getDb().prepare(`
    SELECT id
    FROM users
    WHERE role = 'admin'
  `).all() as Array<{ id: number }>

  return new Set(rows.map(row => row.id))
}

export function setUserAutoDeleteDays(userId: number, days: number): void {
  setUserAutoDeletePolicy(userId, days)
}

export function listUserAutoDeleteDays(): Map<number, number> {
  const policies = listUserAutoDeletePolicies()
  return new Map([...policies.entries()].map(([id, policy]) => [id, policy.days]))
}

export function updateUserPassword(userId: number, passwordHash: string): void {
  getDb().prepare(`
    UPDATE users
    SET password_hash = ?
    WHERE id = ?
  `).run(passwordHash, userId)
}

export function ensureUserApiToken(userId: number): string {
  const existing = getUserApiToken(userId)
  if (existing) return existing

  const token = generateApiUploadToken()
  setUserApiToken(userId, token)
  return token
}

export function insertUser(input: {
  username: string
  passwordHash: string
  role: UserRole
  createdAt: string
}): number {
  const result = getDb().prepare(`
    INSERT INTO users (username, password_hash, role, created_at)
    VALUES (?, ?, ?, ?)
  `).run(input.username, input.passwordHash, input.role, input.createdAt)
  return Number(result.lastInsertRowid)
}

export function createSessionRow(input: {
  id: string
  userId: number
  tokenHash: string
  expiresAt: string
  createdAt: string
}): void {
  getDb().prepare(`
    INSERT INTO sessions (id, user_id, token_hash, expires_at, created_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(
    input.id,
    input.userId,
    input.tokenHash,
    input.expiresAt,
    input.createdAt
  )
}

export function findSessionById(id: string): SessionRow | null {
  const row = getDb().prepare(`
    SELECT id, user_id, token_hash, expires_at, created_at
    FROM sessions
    WHERE id = ?
  `).get(id) as SessionRow | undefined
  return row ?? null
}

export function deleteSession(id: string): void {
  getDb().prepare('DELETE FROM sessions WHERE id = ?').run(id)
}

export function deleteSessionsForUser(userId: number): void {
  getDb().prepare('DELETE FROM sessions WHERE user_id = ?').run(userId)
}

export const SETTINGS_API_UPLOAD_TOKEN = 'api_upload_token'
export const SETTINGS_WEBP_QUALITY = 'webp_quality'
export const SETTINGS_ALLOWED_REFERER_HOSTS = 'allowed_referer_hosts'
export const SETTINGS_HIDE_FOLDER_IN_URL = 'hide_folder_in_url'
export const SETTINGS_STORAGE_USE_DATE_PATH = 'storage_use_date_path'
export const SETTINGS_SITE_BASE_URL = 'site_base_url'
export const SETTINGS_IMAGE_BASE_URL = 'image_base_url'
export const SETTINGS_AUTO_DELETE_DAYS = 'auto_delete_days'
export const SETTINGS_AUTO_DELETE_ENABLED_AT = 'auto_delete_enabled_at'
export const SETTINGS_ALLOW_REGISTRATION = 'allow_registration'
export const SETTINGS_LOGIN_VERIFICATION_METHOD = 'login_verification_method'
export const SETTINGS_TURNSTILE_SITE_KEY = 'turnstile_site_key'
export const SETTINGS_TURNSTILE_SECRET_KEY = 'turnstile_secret_key'
export const SETTINGS_CAP_API_ENDPOINT = 'cap_api_endpoint'
export const SETTINGS_CAP_SECRET = 'cap_secret'

export function isAllowRegistration(): boolean {
  return getSetting(SETTINGS_ALLOW_REGISTRATION) === 'true'
}

export function setAllowRegistration(allow: boolean): void {
  setSetting(SETTINGS_ALLOW_REGISTRATION, allow ? 'true' : 'false')
}

export function getSetting(key: string): string | null {
  const row = getDb().prepare(`
    SELECT value
    FROM settings
    WHERE key = ?
  `).get(key) as { value: string } | undefined
  return row?.value ?? null
}

export function setSetting(key: string, value: string): void {
  const updatedAt = new Date().toISOString()
  getDb().prepare(`
    INSERT INTO settings (key, value, updated_at)
    VALUES (?, ?, ?)
    ON CONFLICT(key) DO UPDATE SET
      value = excluded.value,
      updated_at = excluded.updated_at
  `).run(key, value, updatedAt)
}

export function generateApiUploadToken(): string {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('')
}

export function insertActivityLog(input: ActivityLogInput): void {
  try {
    const createdAt = input.createdAt ?? new Date().toISOString()
    getDb().prepare(`
      INSERT INTO activity_logs
        (action, key, original_name, size, content_type, source, user_id, backend_id, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      input.action,
      input.key,
      input.originalName,
      input.size,
      input.contentType,
      input.source,
      input.userId ?? null,
      input.backendId ?? null,
      createdAt
    )
  } catch (error) {
    logException('activity-log insert failed', error, {
      action: input.action,
      key: input.key
    })
  }
}

/** 按图片 key 查最近一次上传记录的来源（网页 / API） */
export function getUploadSourcesForKeys(keys: string[]): Map<string, LogSource> {
  const result = new Map<string, LogSource>()
  if (!keys.length) return result

  const placeholders = keys.map(() => '?').join(', ')
  const rows = getDb().prepare(`
    SELECT al.key, al.source
    FROM activity_logs al
    INNER JOIN (
      SELECT key, MAX(id) AS max_id
      FROM activity_logs
      WHERE action = 'upload' AND key IN (${placeholders})
      GROUP BY key
    ) latest ON al.id = latest.max_id
  `).all(...keys) as Array<{ key: string, source: string }>

  for (const row of rows) {
    const raw = row.source
    const source = raw === 'twikoo' ? 'api' : raw
    if (source === 'web' || source === 'api') {
      result.set(row.key, source)
    }
  }

  return result
}

export function listActivityLogs(options: {
  limit: number
  page?: number
  action?: LogAction
  source?: LogSource
  folder?: string
  userId?: number
  search?: string
}): {
  items: ActivityLogRow[]
  total: number
  page: number
  pageSize: number
  totalPages: number
} {
  const database = getDb()
  const pageSize = options.limit
  const { whereSql, params } = buildActivityLogWhere(options)

  const countRow = database.prepare(`
    SELECT COUNT(*) AS count
    FROM activity_logs al
    ${whereSql}
  `).get(...params) as { count: number }

  const total = countRow.count
  const totalPages = Math.max(1, Math.ceil(total / pageSize) || 1)
  const requestedPage = Math.max(1, options.page ?? 1)
  const safePage = Math.min(requestedPage, totalPages)
  const offset = (safePage - 1) * pageSize

  const rows = database.prepare(`
    SELECT
      al.id,
      al.action,
      al.key,
      al.original_name,
      al.size,
      al.content_type,
      al.source,
      al.user_id,
      u.username,
      al.backend_id,
      sb.name AS backend_name,
      sb.type AS backend_type,
      al.created_at
    FROM activity_logs al
    LEFT JOIN users u ON u.id = al.user_id
    LEFT JOIN storage_backends sb ON sb.id = al.backend_id
    ${whereSql}
    ORDER BY al.id DESC
    LIMIT ? OFFSET ?
  `).all(...params, pageSize, offset) as unknown as ActivityLogRow[]

  return {
    items: rows,
    total,
    page: safePage,
    pageSize,
    totalPages
  }
}

export function summarizeActivityLogs(options: {
  source?: LogSource
  folder?: string
  userId?: number
  search?: string
}): {
  total: number
  upload: number
  delete: number
} {
  const database = getDb()
  const { whereSql, params } = buildActivityLogWhere(options, { includeAction: false })
  const row = database.prepare(`
    SELECT
      COUNT(*) AS total,
      COALESCE(SUM(CASE WHEN al.action = 'upload' THEN 1 ELSE 0 END), 0) AS upload_count,
      COALESCE(SUM(CASE WHEN al.action = 'delete' THEN 1 ELSE 0 END), 0) AS delete_count
    FROM activity_logs al
    ${whereSql}
  `).get(...params) as { total: number, upload_count: number, delete_count: number } | undefined

  return {
    total: row?.total ?? 0,
    upload: row?.upload_count ?? 0,
    delete: row?.delete_count ?? 0
  }
}

function buildActivityLogWhere(
  options: {
    action?: LogAction
    source?: LogSource
    folder?: string
    userId?: number
    search?: string
  },
  { includeAction = true }: { includeAction?: boolean } = {}
): { whereSql: string, params: Array<string | number> } {
  const params: Array<string | number> = []
  const where: string[] = []

  if (includeAction && options.action) {
    where.push('al.action = ?')
    params.push(options.action)
  }
  if (options.source) {
    where.push('al.source = ?')
    params.push(options.source)
  }
  if (options.folder) {
    where.push('al.key LIKE ?')
    params.push(`${options.folder}/%`)
  }
  if (options.userId !== undefined) {
    where.push('al.user_id = ?')
    params.push(options.userId)
  }
  if (options.search) {
    where.push('al.original_name LIKE ?')
    params.push(`%${options.search}%`)
  }

  return {
    whereSql: where.length ? `WHERE ${where.join(' AND ')}` : '',
    params
  }
}

function countSince(action: LogAction, sinceIso: string): number {
  const row = getDb().prepare(`
    SELECT COUNT(*) AS total
    FROM activity_logs
    WHERE action = ? AND created_at >= ?
  `).get(action, sinceIso) as unknown as { total: number } | undefined
  return row?.total ?? 0
}

function countBetween(action: LogAction, startIso: string, endIso: string): number {
  const row = getDb().prepare(`
    SELECT COUNT(*) AS total
    FROM activity_logs
    WHERE action = ? AND created_at >= ? AND created_at < ?
  `).get(action, startIso, endIso) as unknown as { total: number } | undefined
  return row?.total ?? 0
}

function sumUploadBytes(): number {
  const row = getDb().prepare(`
    SELECT COALESCE(SUM(size), 0) AS total
    FROM activity_logs
    WHERE action = 'upload'
  `).get() as unknown as { total: number } | undefined
  return row?.total ?? 0
}

function countByUploadFolder(): Array<{ folder: string, count: number }> {
  const rows = getDb().prepare(`
    SELECT
      CASE
        WHEN instr(key, '/') > 0 THEN substr(key, 1, instr(key, '/') - 1)
        ELSE '(root)'
      END AS folder,
      COUNT(*) AS total
    FROM activity_logs
    WHERE action = 'upload'
    GROUP BY folder
    ORDER BY total DESC, folder ASC
  `).all() as unknown as Array<{ folder: string, total: number }>

  return rows.map(row => ({ folder: row.folder, count: row.total }))
}

function countBySource(): Record<LogSource, number> {
  const rows = getDb().prepare(`
    SELECT source, COUNT(*) AS total
    FROM activity_logs
    WHERE action = 'upload'
    GROUP BY source
  `).all() as unknown as Array<{ source: LogSource, total: number }>

  const result: Record<LogSource, number> = { web: 0, api: 0 }
  for (const row of rows) {
    const raw = row.source as string
    const source = raw === 'twikoo' ? 'api' : row.source
    if (source === 'web' || source === 'api') {
      result[source] += row.total
    }
  }
  return result
}

function startOfDayIsoInShanghai(now = new Date()): string {
  // Asia/Shanghai = UTC+8，没有夏令时
  const shifted = new Date(now.getTime() + 8 * 60 * 60 * 1000)
  const y = shifted.getUTCFullYear()
  const m = shifted.getUTCMonth()
  const d = shifted.getUTCDate()
  return new Date(Date.UTC(y, m, d) - 8 * 60 * 60 * 1000).toISOString()
}

function startOfMonthIsoInShanghai(now = new Date()): string {
  const shifted = new Date(now.getTime() + 8 * 60 * 60 * 1000)
  const y = shifted.getUTCFullYear()
  const m = shifted.getUTCMonth()
  return new Date(Date.UTC(y, m, 1) - 8 * 60 * 60 * 1000).toISOString()
}

function startOfYesterdayIsoInShanghai(now = new Date()): string {
  const startOfDay = startOfDayIsoInShanghai(now)
  return new Date(new Date(startOfDay).getTime() - 24 * 60 * 60 * 1000).toISOString()
}

function startOfLastMonthIsoInShanghai(now = new Date()): string {
  const shifted = new Date(now.getTime() + 8 * 60 * 60 * 1000)
  const y = shifted.getUTCFullYear()
  const m = shifted.getUTCMonth()
  return new Date(Date.UTC(y, m - 1, 1) - 8 * 60 * 60 * 1000).toISOString()
}

export function getActivityStats(): {
  uploadToday: number
  uploadYesterday: number
  uploadMonth: number
  uploadLastMonth: number
  deleteToday: number
  deleteMonth: number
  uploadTotal: number
  deleteTotal: number
  uploadBytesTotal: number
  bySource: Record<LogSource, number>
  byFolderUploads: Array<{ folder: string, count: number }>
} {
  const startOfDay = startOfDayIsoInShanghai()
  const startOfMonth = startOfMonthIsoInShanghai()
  const startOfYesterday = startOfYesterdayIsoInShanghai()
  const startOfLastMonth = startOfLastMonthIsoInShanghai()

  const uploadTotalRow = getDb().prepare(`
    SELECT COUNT(*) AS total FROM activity_logs WHERE action = 'upload'
  `).get() as unknown as { total: number }
  const deleteTotalRow = getDb().prepare(`
    SELECT COUNT(*) AS total FROM activity_logs WHERE action = 'delete'
  `).get() as unknown as { total: number }

  return {
    uploadToday: countSince('upload', startOfDay),
    uploadYesterday: countBetween('upload', startOfYesterday, startOfDay),
    uploadMonth: countSince('upload', startOfMonth),
    uploadLastMonth: countBetween('upload', startOfLastMonth, startOfMonth),
    deleteToday: countSince('delete', startOfDay),
    deleteMonth: countSince('delete', startOfMonth),
    uploadTotal: uploadTotalRow.total,
    deleteTotal: deleteTotalRow.total,
    uploadBytesTotal: sumUploadBytes(),
    bySource: countBySource(),
    byFolderUploads: countByUploadFolder()
  }
}
