import { getStorageBackendRow } from './storage-backends'
import { ALLOWED_MIME_TYPES } from './constants'
import { parseTagIdsParam, type TagFilterInput } from './tags'

export function readBackendIdQuery(
  query: Record<string, unknown>
): string | undefined | null {
  const raw = typeof query.backendId === 'string' ? query.backendId.trim() : ''
  if (!raw || raw === 'all') return undefined
  return getStorageBackendRow(raw)?.id ?? null
}

export function readContentTypeQuery(
  query: Record<string, unknown>
): string | undefined | null {
  const raw = typeof query.contentType === 'string' ? query.contentType.trim() : ''
  if (!raw || raw === 'all') return undefined
  if (!(ALLOWED_MIME_TYPES as readonly string[]).includes(raw)) return null
  return raw
}

export function readUploadSourceQuery(
  query: Record<string, unknown>
): 'web' | 'api' | undefined | null {
  const raw = typeof query.uploadSource === 'string' ? query.uploadSource.trim() : ''
  if (!raw || raw === 'all') return undefined
  if (raw === 'web' || raw === 'api') return raw
  return null
}

export function readTagFilterQuery(
  query: Record<string, unknown>
): TagFilterInput | null | undefined {
  const untaggedRaw = query.untagged
  const untaggedOnly = untaggedRaw === '1'
    || untaggedRaw === 'true'
    || untaggedRaw === true

  const tagIds = parseTagIdsParam(query.tagIds ?? query.tagId)
  const tagModeRaw = typeof query.tagMode === 'string' ? query.tagMode.trim().toLowerCase() : ''
  const tagMode = tagModeRaw === 'and' ? 'and' : 'or'

  if (untaggedOnly && tagIds.length) {
    return null
  }

  if (!untaggedOnly && !tagIds.length) {
    return undefined
  }

  return {
    tagIds: tagIds.length ? tagIds : undefined,
    tagMode,
    untaggedOnly: untaggedOnly || undefined
  }
}
