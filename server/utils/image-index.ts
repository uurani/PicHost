import { promises as fs } from 'node:fs'
import { dirname, join } from 'node:path'
import { getDb, getUploadSourcesForKeys } from './db'
import { getDataDir } from './data-dir'
import { contentTypeFromKey } from './content-type'
import { DEFAULT_FOLDER, toCanonicalImageKey, validateImageKey } from './image-key'
import { buildTagFilterSql, type TagFilterInput } from './tags'
import { isBareImageFilename, isHiddenImageDatePath } from './image-public-path'
import {
  ensureDefaultBackends,
  ensureStorageSchema,
  LOCAL_BACKEND_ID
} from './storage-backends'
import type { PaginatedResult, StoredImage, StoredImageMeta } from './storage/types'

const META_SUFFIX = '.meta.json'

export interface ImageIndexRow {
  key: string
  backend_id: string
  user_id: number | null
  folder: string
  original_name: string
  content_type: string
  size: number
  uploaded_at: string
}

function keyToFilePath(key: string): string {
  return join(getDataDir(), ...key.split('/'))
}

async function readLocalMeta(key: string): Promise<Partial<StoredImageMeta>> {
  try {
    const raw = await fs.readFile(keyToFilePath(key) + META_SUFFIX, 'utf8')
    return JSON.parse(raw) as Partial<StoredImageMeta>
  } catch {
    return {}
  }
}

function rowToStoredImage(row: ImageIndexRow): StoredImage {
  const uploadedMs = new Date(row.uploaded_at).getTime()
  return {
    key: row.key,
    backendId: row.backend_id,
    originalName: row.original_name,
    uploadedAt: row.uploaded_at,
    contentType: row.content_type,
    size: row.size,
    userId: row.user_id,
    mtimeMs: Number.isFinite(uploadedMs) ? uploadedMs : Date.now()
  }
}

function buildUserFilterSql(
  userFilter: number | 'admin' | undefined,
  params: Array<string | number>
): string {
  if (userFilter === undefined || userFilter === 'admin') return ''
  params.push(userFilter)
  return ' AND user_id = ?'
}

export function insertImageIndex(input: {
  key: string
  backendId: string
  userId?: number | null
  originalName: string
  contentType: string
  size: number
  uploadedAt: string
}): void {
  ensureStorageSchema()
  const folder = input.key.split('/')[0] ?? DEFAULT_FOLDER
  getDb().prepare(`
    INSERT INTO images
      (key, backend_id, user_id, folder, original_name, content_type, size, uploaded_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(key) DO UPDATE SET
      backend_id = excluded.backend_id,
      user_id = excluded.user_id,
      folder = excluded.folder,
      original_name = excluded.original_name,
      content_type = excluded.content_type,
      size = excluded.size,
      uploaded_at = excluded.uploaded_at
  `).run(
    input.key,
    input.backendId,
    input.userId ?? null,
    folder,
    input.originalName,
    input.contentType,
    input.size,
    input.uploadedAt
  )
}

export function deleteImageIndex(key: string): void {
  ensureStorageSchema()
  getDb().prepare('DELETE FROM images WHERE key = ?').run(key)
}

function preferIndexedImageKey(key: string): string {
  const canonical = toCanonicalImageKey(key)
  if (canonical && getImageIndexRow(canonical)) return canonical
  if (validateImageKey(key)) return key
  return key
}

async function fileExistsAtKey(key: string): Promise<boolean> {
  try {
    await fs.access(keyToFilePath(key))
    return true
  } catch {
    return false
  }
}

/** 将 SQLite 中遗留顶层目录 key 归一为 images/ 下路径，并同步磁盘文件 */
export async function reconcileLegacyImageKeys(): Promise<{
  updated: number
  removed: number
}> {
  ensureStorageSchema()
  const rows = getDb().prepare('SELECT key FROM images').all() as Array<{ key: string }>
  let updated = 0
  let removed = 0

  for (const { key } of rows) {
    if (validateImageKey(key)) continue

    const canonical = toCanonicalImageKey(key)
    if (!canonical) continue

    const canonicalRow = getImageIndexRow(canonical)
    if (canonicalRow) {
      deleteImageIndex(key)
      removed++
      continue
    }

    const canonicalExists = await fileExistsAtKey(canonical)
    const legacyExists = await fileExistsAtKey(key)

    if (canonicalExists) {
      getDb().prepare(`
        UPDATE images
        SET key = ?, folder = ?
        WHERE key = ?
      `).run(canonical, DEFAULT_FOLDER, key)
      updated++
      continue
    }

    if (legacyExists) {
      const legacyPath = keyToFilePath(key)
      const canonicalPath = keyToFilePath(canonical)
      await fs.mkdir(dirname(canonicalPath), { recursive: true })
      await fs.rename(legacyPath, canonicalPath)
      try {
        await fs.rename(legacyPath + META_SUFFIX, canonicalPath + META_SUFFIX)
      } catch {
        // no meta
      }
      getDb().prepare(`
        UPDATE images
        SET key = ?, folder = ?
        WHERE key = ?
      `).run(canonical, DEFAULT_FOLDER, key)
      updated++
    }
  }

  return { updated, removed }
}

/** 移除 SQLite 中有记录但本地磁盘无对应文件的索引行 */
export async function purgeOrphanImageIndexRows(): Promise<number> {
  ensureStorageSchema()
  const rows = getDb().prepare(`
    SELECT key, backend_id FROM images
  `).all() as Array<{ key: string, backend_id: string }>

  let removed = 0
  for (const row of rows) {
    if (row.backend_id !== LOCAL_BACKEND_ID) continue
    if (await fileExistsAtKey(row.key)) continue
    const canonical = toCanonicalImageKey(row.key)
    if (canonical && await fileExistsAtKey(canonical)) continue
    deleteImageIndex(row.key)
    removed++
  }
  return removed
}

export function getImageIndexRow(key: string): ImageIndexRow | null {
  ensureStorageSchema()
  const row = getDb().prepare(`
    SELECT key, backend_id, user_id, folder, original_name, content_type, size, uploaded_at
    FROM images
    WHERE key = ?
  `).get(key) as ImageIndexRow | undefined
  return row ?? null
}

export function getImageIndexAsStored(key: string): StoredImage | null {
  const row = getImageIndexRow(key)
  return row ? rowToStoredImage(row) : null
}

/** 隐藏目录 URL（YYYY/MM/file）反查完整 key；多目录同名时优先 images */
export function findImageKeyByDatePath(datePath: string): string | null {
  if (!isHiddenImageDatePath(datePath)) return null

  ensureStorageSchema()
  const suffix = `/${datePath}`
  const rows = getDb().prepare(`
    SELECT key FROM images WHERE key LIKE ?
  `).all(`%${suffix}`) as Array<{ key: string }>

  if (rows.length === 0) {
    const fallback = `${DEFAULT_FOLDER}/${datePath}`
    return validateImageKey(fallback) ? fallback : null
  }
  if (rows.length === 1) return preferIndexedImageKey(rows[0]!.key)

  const exactDefault = rows.find(row => row.key === `${DEFAULT_FOLDER}/${datePath}`)
  if (exactDefault) return exactDefault.key

  const defaultFolder = rows.find(row => row.key.startsWith(`${DEFAULT_FOLDER}/`))
  return defaultFolder?.key ?? rows[0]!.key
}

/** 隐藏目录 URL（纯文件名）反查完整 key；多目录同名时优先 images */
export function findImageKeyByFilename(filename: string): string | null {
  if (!isBareImageFilename(filename)) return null

  ensureStorageSchema()
  const suffix = `/${filename}`
  const rows = getDb().prepare(`
    SELECT key FROM images WHERE key LIKE ?
  `).all(`%${suffix}`) as Array<{ key: string }>

  if (rows.length === 0) {
    const flatFallback = `${DEFAULT_FOLDER}/${filename}`
    return validateImageKey(flatFallback) ? flatFallback : null
  }
  if (rows.length === 1) return preferIndexedImageKey(rows[0]!.key)

  const exactDefault = rows.find(row => row.key === `${DEFAULT_FOLDER}/${filename}`)
  if (exactDefault) return exactDefault.key

  const defaultFolder = rows.find(row => row.key.startsWith(`${DEFAULT_FOLDER}/`))
  return defaultFolder?.key ?? rows[0]!.key
}

async function collectImageKeysRecursive(
  dir: string,
  keyPrefix: string
): Promise<string[]> {
  const keys: string[] = []
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true })
    for (const entry of entries) {
      const name = String(entry.name)
      if (entry.isDirectory()) {
        const childKeys = await collectImageKeysRecursive(
          join(dir, name),
          `${keyPrefix}/${name}`
        )
        keys.push(...childKeys)
      } else if (entry.isFile()) {
        if (name.endsWith(META_SUFFIX)) continue
        const key = `${keyPrefix}/${name}`
        if (validateImageKey(key)) keys.push(key)
      }
    }
  } catch {
    return keys
  }

  return keys
}

async function listLocalImageKeys(): Promise<string[]> {
  const imagesRoot = join(getDataDir(), DEFAULT_FOLDER)
  return collectImageKeysRecursive(imagesRoot, DEFAULT_FOLDER)
}

export async function migrateLocalImagesToIndex(): Promise<number> {
  ensureDefaultBackends()
  const keys = await listLocalImageKeys()
  let inserted = 0

  for (const key of keys) {
    const existing = getImageIndexRow(key)
    if (existing) continue

    let stat
    try {
      stat = await fs.stat(keyToFilePath(key))
    } catch {
      continue
    }

    const meta = await readLocalMeta(key)
    const uploadedAt = meta.uploadedAt ?? stat.mtime.toISOString()

    const inferredType = contentTypeFromKey(key)
    const contentType = meta.contentType && meta.contentType !== 'application/octet-stream'
      ? meta.contentType
      : inferredType

    insertImageIndex({
      key,
      backendId: LOCAL_BACKEND_ID,
      userId: meta.userId ?? null,
      originalName: meta.originalName ?? key.split('/').pop() ?? 'image',
      contentType,
      size: stat.size,
      uploadedAt
    })
    inserted++
  }

  return inserted
}

export async function listFolders(): Promise<string[]> {
  return [DEFAULT_FOLDER]
}

export async function listFoldersForUser(
  _userFilter?: number | 'admin'
): Promise<string[]> {
  return [DEFAULT_FOLDER]
}

/** 修正存量索引中错误的 application/octet-stream */
export function repairLocalImageIndexMetadata(): number {
  ensureStorageSchema()
  const rows = getDb().prepare(`
    SELECT key, content_type FROM images WHERE content_type = 'application/octet-stream'
  `).all() as Array<{ key: string, content_type: string }>

  let repaired = 0
  const update = getDb().prepare(`
    UPDATE images SET content_type = ? WHERE key = ?
  `)

  for (const row of rows) {
    const inferred = contentTypeFromKey(row.key)
    if (inferred !== 'application/octet-stream') {
      update.run(inferred, row.key)
      repaired++
    }
  }

  return repaired
}

function buildBackendFilterSql(
  backendId: string | undefined,
  params: Array<string | number>
): string {
  if (!backendId) return ''
  params.push(backendId)
  return ' AND backend_id = ?'
}

export function getImageTotals(): { count: number, bytes: number } {
  ensureStorageSchema()
  const row = getDb().prepare(`
    SELECT COUNT(*) AS count, COALESCE(SUM(size), 0) AS bytes
    FROM images
  `).get() as { count: number, bytes: number }
  return { count: row.count, bytes: Number(row.bytes) }
}

export function listAllImageIndexRows(): ImageIndexRow[] {
  ensureStorageSchema()
  return getDb().prepare(`
    SELECT key, backend_id, user_id, folder, original_name, content_type, size, uploaded_at
    FROM images
    ORDER BY key ASC
  `).all() as unknown as ImageIndexRow[]
}

export function listImageIndexRowsByBackend(backendId: string): ImageIndexRow[] {
  ensureStorageSchema()
  return getDb().prepare(`
    SELECT key, backend_id, user_id, folder, original_name, content_type, size, uploaded_at
    FROM images
    WHERE backend_id = ?
    ORDER BY key ASC
  `).all(backendId) as unknown as ImageIndexRow[]
}

export function updateImageBackendId(key: string, backendId: string): void {
  ensureStorageSchema()
  getDb().prepare(`
    UPDATE images SET backend_id = ? WHERE key = ?
  `).run(backendId, key)
}

export async function countImages(
  userFilter?: number | 'admin',
  backendId?: string,
  tagFilter?: TagFilterInput
): Promise<number> {
  ensureStorageSchema()
  const params: Array<string | number> = []
  const clauses: string[] = ['1=1']

  const userSql = buildUserFilterSql(userFilter, params)
  const backendSql = buildBackendFilterSql(backendId, params)
  const tagSql = buildTagFilterSql(tagFilter, params)
  const row = getDb().prepare(`
    SELECT COUNT(*) AS count FROM images WHERE ${clauses.join(' AND ')}${userSql}${backendSql}${tagSql}
  `).get(...params) as { count: number }

  return row.count
}

function paginateSlice<T>(
  all: T[],
  limit: number,
  page?: number
): PaginatedResult<T> {
  const total = all.length
  const pageSize = limit
  const totalPages = Math.max(1, Math.ceil(total / pageSize) || 1)
  const requestedPage = Math.max(1, page ?? 1)
  const safePage = Math.min(requestedPage, totalPages)
  const start = (safePage - 1) * pageSize
  const items = all.slice(start, start + pageSize)

  return { items, total, page: safePage, pageSize, totalPages }
}

function filterImageRows(
  rows: ImageIndexRow[],
  options: {
    contentType?: string
    uploadSource?: 'web' | 'api'
  }
): ImageIndexRow[] {
  let filtered = rows
  if (options.contentType) {
    filtered = filtered.filter(row => row.content_type === options.contentType)
  }
  if (options.uploadSource) {
    const sourceMap = getUploadSourcesForKeys(filtered.map(row => row.key))
    filtered = filtered.filter(row => sourceMap.get(row.key) === options.uploadSource)
  }
  return filtered
}

export async function listImages(options: {
  limit: number
  page?: number
  userFilter?: number | 'admin'
  backendId?: string
  contentType?: string
  uploadSource?: 'web' | 'api'
  tagFilter?: TagFilterInput
}): Promise<PaginatedResult<StoredImage>> {
  ensureStorageSchema()
  const params: Array<string | number> = []
  const clauses: string[] = ['1=1']

  const userSql = buildUserFilterSql(options.userFilter, params)
  const backendSql = buildBackendFilterSql(options.backendId, params)
  const tagSql = buildTagFilterSql(options.tagFilter, params)
  const rows = getDb().prepare(`
    SELECT key, backend_id, user_id, folder, original_name, content_type, size, uploaded_at
    FROM images
    WHERE ${clauses.join(' AND ')}${userSql}${backendSql}${tagSql}
    ORDER BY uploaded_at DESC, key DESC
  `).all(...params) as unknown as ImageIndexRow[]

  const filtered = filterImageRows(rows, {
    contentType: options.contentType,
    uploadSource: options.uploadSource
  })
  const sliced = paginateSlice(filtered, options.limit, options.page)
  return {
    ...sliced,
    items: sliced.items.map(rowToStoredImage)
  }
}

export async function searchImages(options: {
  query: string
  limit: number
  page?: number
  userFilter?: number | 'admin'
  backendId?: string
  contentType?: string
  uploadSource?: 'web' | 'api'
  tagFilter?: TagFilterInput
}): Promise<PaginatedResult<StoredImage>> {
  ensureStorageSchema()
  const needle = options.query.trim().toLowerCase()
  const params: Array<string | number> = []
  const clauses: string[] = ['1=1']

  const userSql = buildUserFilterSql(options.userFilter, params)
  const backendSql = buildBackendFilterSql(options.backendId, params)
  const tagSql = buildTagFilterSql(options.tagFilter, params)
  const rows = getDb().prepare(`
    SELECT key, backend_id, user_id, folder, original_name, content_type, size, uploaded_at
    FROM images
    WHERE ${clauses.join(' AND ')}${userSql}${backendSql}${tagSql}
    ORDER BY uploaded_at DESC, key DESC
  `).all(...params) as unknown as ImageIndexRow[]

  const matches = rows.filter((row) => {
    if (!needle) return true
    return row.key.toLowerCase().includes(needle)
      || row.original_name.toLowerCase().includes(needle)
  })

  const filtered = filterImageRows(matches, {
    contentType: options.contentType,
    uploadSource: options.uploadSource
  })
  const sliced = paginateSlice(filtered, options.limit, options.page)
  return {
    ...sliced,
    items: sliced.items.map(rowToStoredImage)
  }
}

export async function getFolderStorageStats(
  userFilter?: number | 'admin',
  tagFilter?: TagFilterInput
): Promise<Array<{ folder: string, count: number, bytes: number }>> {
  ensureStorageSchema()
  const params: Array<string | number> = []
  const userSql = buildUserFilterSql(userFilter, params)
  const tagSql = buildTagFilterSql(tagFilter, params)

  const rows = getDb().prepare(`
    SELECT folder, COUNT(*) AS count, COALESCE(SUM(size), 0) AS bytes
    FROM images
    WHERE 1=1${userSql}${tagSql}
    GROUP BY folder
    ORDER BY bytes DESC, folder ASC
  `).all(...params) as Array<{ folder: string, count: number, bytes: number }>

  return rows
}

function startOfDayIsoInShanghai(now = new Date()): string {
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

function startOfLastMonthIsoInShanghai(now = new Date()): string {
  const shifted = new Date(now.getTime() + 8 * 60 * 60 * 1000)
  const y = shifted.getUTCFullYear()
  const m = shifted.getUTCMonth()
  return new Date(Date.UTC(y, m - 1, 1) - 8 * 60 * 60 * 1000).toISOString()
}

function startOfYesterdayIsoInShanghai(now = new Date()): string {
  const startOfDay = startOfDayIsoInShanghai(now)
  return new Date(new Date(startOfDay).getTime() - 24 * 60 * 60 * 1000).toISOString()
}

export async function getUserScopedStorageStats(
  userId: number,
  tagFilter?: TagFilterInput
): Promise<{
  storedCount: number
  uploadBytesTotal: number
  uploadToday: number
  uploadYesterday: number
  uploadMonth: number
  uploadLastMonth: number
  byFolder: Array<{ folder: string, count: number, bytes: number }>
}> {
  ensureStorageSchema()
  const startOfDay = startOfDayIsoInShanghai()
  const startOfMonth = startOfMonthIsoInShanghai()
  const startOfYesterday = startOfYesterdayIsoInShanghai()
  const startOfLastMonth = startOfLastMonthIsoInShanghai()

  const params: Array<string | number> = [userId]
  const tagSql = buildTagFilterSql(tagFilter, params)
  const rows = getDb().prepare(`
    SELECT folder, size, uploaded_at
    FROM images
    WHERE user_id = ?${tagSql}
  `).all(...params) as Array<{ folder: string, size: number, uploaded_at: string }>

  const map = new Map<string, { count: number, bytes: number }>()
  let uploadBytesTotal = 0
  let uploadToday = 0
  let uploadYesterday = 0
  let uploadMonth = 0
  let uploadLastMonth = 0

  for (const row of rows) {
    uploadBytesTotal += row.size
    if (row.uploaded_at >= startOfDay) uploadToday += 1
    if (row.uploaded_at >= startOfYesterday && row.uploaded_at < startOfDay) uploadYesterday += 1
    if (row.uploaded_at >= startOfMonth) uploadMonth += 1
    if (row.uploaded_at >= startOfLastMonth && row.uploaded_at < startOfMonth) uploadLastMonth += 1

    const current = map.get(row.folder) ?? { count: 0, bytes: 0 }
    current.count += 1
    current.bytes += row.size
    map.set(row.folder, current)
  }

  const byFolder = [...map.entries()]
    .map(([folder, stat]) => ({ folder, ...stat }))
    .sort((a, b) => b.bytes - a.bytes || a.folder.localeCompare(b.folder))

  return {
    storedCount: rows.length,
    uploadBytesTotal,
    uploadToday,
    uploadYesterday,
    uploadMonth,
    uploadLastMonth,
    byFolder
  }
}

export async function listImageKeysForAutoDelete(): Promise<StoredImage[]> {
  ensureStorageSchema()
  const rows = getDb().prepare(`
    SELECT key, backend_id, user_id, folder, original_name, content_type, size, uploaded_at
    FROM images
    ORDER BY uploaded_at ASC
  `).all() as unknown as ImageIndexRow[]

  return rows.map(rowToStoredImage)
}
