import { getDb } from './db'
import { getImageIndexRow } from './image-index'

export const TAG_COLOR_PRESETS = [
  '#22c55e',
  '#3b82f6',
  '#f59e0b',
  '#ef4444',
  '#8b5cf6',
  '#06b6d4',
  '#ec4899',
  '#84cc16',
  '#f97316',
  '#6366f1',
  '#14b8a6',
  '#64748b'
] as const

export const MAX_TAGS_PER_USER = 50
export const MAX_TAG_NAME_LENGTH = 32

export interface TagRow {
  id: number
  user_id: number
  name: string
  color: string | null
  created_at: string
}

export interface TagItem {
  id: number
  name: string
  color: string
  imageCount: number
  createdAt: string
  lastUsedAt: string | null
}

export function normalizeTagName(name: string): string {
  return name.trim().replace(/\s+/g, ' ')
}

export function isValidTagName(name: string): boolean {
  const normalized = normalizeTagName(name)
  return normalized.length >= 1 && normalized.length <= MAX_TAG_NAME_LENGTH
}

export function isValidTagColor(color: string | null | undefined): boolean {
  if (color == null || color === '') return true
  return /^#[0-9A-Fa-f]{6}$/.test(color)
}

export function normalizeStoredTagColor(color: string | null | undefined): string | null {
  if (color == null) return null
  const trimmed = color.trim()
  if (!trimmed) return null
  const withHash = trimmed.startsWith('#') ? trimmed : `#${trimmed}`
  return /^#[0-9A-Fa-f]{6}$/.test(withHash) ? withHash.toLowerCase() : null
}

export function defaultTagColor(tagId: number): string {
  return TAG_COLOR_PRESETS[tagId % TAG_COLOR_PRESETS.length]!
}

export function ensureTagSchema(): void {
  const db = getDb()
  db.exec(`
    CREATE TABLE IF NOT EXISTS tags (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      color TEXT,
      created_at TEXT NOT NULL,
      UNIQUE(user_id, name),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
    CREATE INDEX IF NOT EXISTS idx_tags_user_id ON tags(user_id);
    CREATE TABLE IF NOT EXISTS image_tags (
      image_key TEXT NOT NULL,
      tag_id INTEGER NOT NULL,
      PRIMARY KEY (image_key, tag_id),
      FOREIGN KEY (image_key) REFERENCES images(key) ON DELETE CASCADE,
      FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_image_tags_tag_id ON image_tags(tag_id);
    CREATE INDEX IF NOT EXISTS idx_image_tags_image_key ON image_tags(image_key);
  `)
}

function rowToTagItem(
  row: TagRow,
  imageCount: number,
  lastUsedAt: string | null = null
): TagItem {
  return {
    id: row.id,
    name: row.name,
    color: normalizeStoredTagColor(row.color) ?? defaultTagColor(row.id),
    imageCount,
    createdAt: row.created_at,
    lastUsedAt
  }
}

function countImagesForTag(tagId: number): number {
  const row = getDb().prepare(`
    SELECT COUNT(*) AS count FROM image_tags WHERE tag_id = ?
  `).get(tagId) as { count: number }
  return row.count
}

export function listTagsForUser(userId: number): TagItem[] {
  ensureTagSchema()
  const rows = getDb().prepare(`
    SELECT t.id, t.user_id, t.name, t.color, t.created_at,
           COUNT(it.image_key) AS image_count,
           MAX(i.uploaded_at) AS last_used_at
    FROM tags t
    LEFT JOIN image_tags it ON it.tag_id = t.id
    LEFT JOIN images i ON i.key = it.image_key
    WHERE t.user_id = ?
    GROUP BY t.id
    ORDER BY t.name ASC
  `).all(userId) as unknown as Array<TagRow & { image_count: number, last_used_at: string | null }>

  return rows.map(row => rowToTagItem(row, row.image_count, row.last_used_at))
}

export function getTagById(tagId: number): TagRow | null {
  ensureTagSchema()
  return getDb().prepare(`
    SELECT id, user_id, name, color, created_at FROM tags WHERE id = ?
  `).get(tagId) as TagRow | undefined ?? null
}

export function getTagForUser(userId: number, tagId: number): TagRow | null {
  const row = getTagById(tagId)
  if (!row || row.user_id !== userId) return null
  return row
}

export function findTagByName(userId: number, name: string): TagRow | null {
  ensureTagSchema()
  const normalized = normalizeTagName(name)
  return getDb().prepare(`
    SELECT id, user_id, name, color, created_at
    FROM tags
    WHERE user_id = ? AND name = ?
  `).get(userId, normalized) as TagRow | undefined ?? null
}

export function createTag(
  userId: number,
  name: string,
  color?: string | null
): TagItem {
  ensureTagSchema()
  const normalized = normalizeTagName(name)
  if (!isValidTagName(normalized)) {
    throw new Error('INVALID_TAG_NAME')
  }
  if (color != null && color !== '' && !isValidTagColor(color)) {
    throw new Error('INVALID_TAG_COLOR')
  }

  const existing = findTagByName(userId, normalized)
  if (existing) {
    throw new Error('TAG_EXISTS')
  }

  const count = getDb().prepare(`
    SELECT COUNT(*) AS count FROM tags WHERE user_id = ?
  `).get(userId) as { count: number }
  if (count.count >= MAX_TAGS_PER_USER) {
    throw new Error('TAG_LIMIT_REACHED')
  }

  const createdAt = new Date().toISOString()
  const storedColor = normalizeStoredTagColor(color)
  const result = getDb().prepare(`
    INSERT INTO tags (user_id, name, color, created_at)
    VALUES (?, ?, ?, ?)
  `).run(userId, normalized, storedColor, createdAt)

  const id = Number(result.lastInsertRowid)
  const row = getTagById(id)!
  return rowToTagItem(row, 0)
}

export function updateTag(
  userId: number,
  tagId: number,
  patch: { name?: string, color?: string | null }
): TagItem {
  ensureTagSchema()
  const row = getTagForUser(userId, tagId)
  if (!row) {
    throw new Error('TAG_NOT_FOUND')
  }

  let nextName = row.name
  if (patch.name !== undefined) {
    const normalized = normalizeTagName(patch.name)
    if (!isValidTagName(normalized)) {
      throw new Error('INVALID_TAG_NAME')
    }
    if (normalized !== row.name) {
      const duplicate = findTagByName(userId, normalized)
      if (duplicate && duplicate.id !== tagId) {
        throw new Error('TAG_EXISTS')
      }
      nextName = normalized
    }
  }

  let nextColor = row.color
  if (patch.color !== undefined) {
    if (patch.color !== null && patch.color !== '' && !isValidTagColor(patch.color)) {
      throw new Error('INVALID_TAG_COLOR')
    }
    nextColor = normalizeStoredTagColor(patch.color)
  }

  getDb().prepare(`
    UPDATE tags SET name = ?, color = ? WHERE id = ?
  `).run(nextName, nextColor, tagId)

  const updated = getTagById(tagId)!
  return rowToTagItem(updated, countImagesForTag(tagId))
}

export function deleteTag(userId: number, tagId: number): boolean {
  ensureTagSchema()
  const row = getTagForUser(userId, tagId)
  if (!row) return false
  getDb().prepare('DELETE FROM tags WHERE id = ?').run(tagId)
  return true
}

export function mergeTags(
  userId: number,
  sourceIds: number[],
  targetId: number
): TagItem {
  ensureTagSchema()
  const uniqueSources = [...new Set(sourceIds.filter(id => id !== targetId))]
  const target = getTagForUser(userId, targetId)
  if (!target) {
    throw new Error('TAG_NOT_FOUND')
  }

  for (const sourceId of uniqueSources) {
    const source = getTagForUser(userId, sourceId)
    if (!source) {
      throw new Error('TAG_NOT_FOUND')
    }
  }

  const db = getDb()
  db.exec('BEGIN')
  try {
    for (const sourceId of uniqueSources) {
      db.prepare(`
        INSERT OR IGNORE INTO image_tags (image_key, tag_id)
        SELECT image_key, ? FROM image_tags WHERE tag_id = ?
      `).run(targetId, sourceId)
      db.prepare('DELETE FROM image_tags WHERE tag_id = ?').run(sourceId)
      db.prepare('DELETE FROM tags WHERE id = ?').run(sourceId)
    }
    db.exec('COMMIT')
  } catch (error) {
    db.exec('ROLLBACK')
    throw error
  }

  const updated = getTagById(targetId)!
  return rowToTagItem(updated, countImagesForTag(targetId))
}

export function getTagsForImageKeys(keys: string[]): Map<string, TagItem[]> {
  ensureTagSchema()
  const map = new Map<string, TagItem[]>()
  if (!keys.length) return map

  const placeholders = keys.map(() => '?').join(', ')
  const rows = getDb().prepare(`
    SELECT it.image_key, t.id, t.user_id, t.name, t.color, t.created_at
    FROM image_tags it
    INNER JOIN tags t ON t.id = it.tag_id
    WHERE it.image_key IN (${placeholders})
    ORDER BY t.name ASC
  `).all(...keys) as unknown as Array<TagRow & { image_key: string }>

  for (const row of rows) {
    const list = map.get(row.image_key) ?? []
    list.push(rowToTagItem(row, 0))
    map.set(row.image_key, list)
  }
  return map
}

function assertTagsOwnedByUser(userId: number, tagIds: number[]): void {
  if (!tagIds.length) return
  const placeholders = tagIds.map(() => '?').join(', ')
  const rows = getDb().prepare(`
    SELECT id FROM tags WHERE user_id = ? AND id IN (${placeholders})
  `).all(userId, ...tagIds) as Array<{ id: number }>
  if (rows.length !== tagIds.length) {
    throw new Error('TAG_NOT_FOUND')
  }
}

function resolveImageOwnerUserId(key: string): number | null {
  const row = getImageIndexRow(key)
  return row?.user_id ?? null
}

export function assertCanTagImage(key: string, actorUserId: number, isAdmin: boolean): void {
  const ownerId = resolveImageOwnerUserId(key)
  if (ownerId == null) {
    throw new Error('IMAGE_NOT_FOUND')
  }
  if (!isAdmin && ownerId !== actorUserId) {
    throw new Error('FORBIDDEN')
  }
}

export function addTagsToImage(
  key: string,
  tagIds: number[],
  actorUserId: number,
  isAdmin: boolean
): TagItem[] {
  ensureTagSchema()
  assertCanTagImage(key, actorUserId, isAdmin)
  const ownerId = resolveImageOwnerUserId(key)!
  const uniqueTagIds = [...new Set(tagIds)]
  assertTagsOwnedByUser(ownerId, uniqueTagIds)

  const insert = getDb().prepare(`
    INSERT OR IGNORE INTO image_tags (image_key, tag_id) VALUES (?, ?)
  `)
  for (const tagId of uniqueTagIds) {
    insert.run(key, tagId)
  }

  return getTagsForImageKeys([key]).get(key) ?? []
}

export function removeTagFromImage(
  key: string,
  tagId: number,
  actorUserId: number,
  isAdmin: boolean
): TagItem[] {
  ensureTagSchema()
  assertCanTagImage(key, actorUserId, isAdmin)
  const ownerId = resolveImageOwnerUserId(key)!
  assertTagsOwnedByUser(ownerId, [tagId])

  getDb().prepare(`
    DELETE FROM image_tags WHERE image_key = ? AND tag_id = ?
  `).run(key, tagId)

  return getTagsForImageKeys([key]).get(key) ?? []
}

export function setImageTags(
  key: string,
  tagIds: number[],
  actorUserId: number,
  isAdmin: boolean
): TagItem[] {
  ensureTagSchema()
  assertCanTagImage(key, actorUserId, isAdmin)
  const ownerId = resolveImageOwnerUserId(key)!
  const uniqueTagIds = [...new Set(tagIds)]
  assertTagsOwnedByUser(ownerId, uniqueTagIds)

  const db = getDb()
  db.exec('BEGIN')
  try {
    db.prepare('DELETE FROM image_tags WHERE image_key = ?').run(key)
    const insert = db.prepare(`
      INSERT INTO image_tags (image_key, tag_id) VALUES (?, ?)
    `)
    for (const tagId of uniqueTagIds) {
      insert.run(key, tagId)
    }
    db.exec('COMMIT')
  } catch (error) {
    db.exec('ROLLBACK')
    throw error
  }

  return getTagsForImageKeys([key]).get(key) ?? []
}

export function attachTagsAfterUpload(
  key: string,
  tagIds: number[],
  userId: number | null
): void {
  if (!tagIds.length || userId == null) return
  addTagsToImage(key, tagIds, userId, true)
}

export function batchAddTagsToImages(
  keys: string[],
  tagIds: number[],
  actorUserId: number,
  isAdmin: boolean
): number {
  ensureTagSchema()
  let updated = 0
  for (const key of keys) {
    addTagsToImage(key, tagIds, actorUserId, isAdmin)
    updated++
  }
  return updated
}

export interface TagFilterInput {
  tagIds?: number[]
  tagMode?: 'or' | 'and'
  untaggedOnly?: boolean
}

export function buildTagFilterSql(
  filter: TagFilterInput | undefined,
  params: Array<string | number>
): string {
  if (!filter?.untaggedOnly && !filter?.tagIds?.length) {
    return ''
  }

  if (filter.untaggedOnly) {
    return ` AND images.key NOT IN (SELECT image_key FROM image_tags)`
  }

  const tagIds = filter.tagIds!
  const placeholders = tagIds.map(() => '?').join(', ')
  params.push(...tagIds)

  if (filter.tagMode === 'and' && tagIds.length > 1) {
    return ` AND images.key IN (
      SELECT image_key FROM image_tags
      WHERE tag_id IN (${placeholders})
      GROUP BY image_key
      HAVING COUNT(DISTINCT tag_id) = ${tagIds.length}
    )`
  }

  return ` AND images.key IN (
    SELECT image_key FROM image_tags WHERE tag_id IN (${placeholders})
  )`
}

export function parseTagIdsParam(raw: unknown): number[] {
  if (raw == null || raw === '') return []
  const parts = Array.isArray(raw)
    ? raw.flatMap(item => String(item).split(','))
    : String(raw).split(',')
  const ids: number[] = []
  for (const part of parts) {
    const trimmed = part.trim()
    if (!trimmed || trimmed === 'all') continue
    const id = Number(trimmed)
    if (!Number.isInteger(id) || id <= 0) continue
    ids.push(id)
  }
  return [...new Set(ids)]
}
