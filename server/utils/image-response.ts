import type { H3Event } from 'h3'
import type { ImageItem } from '~/types/image'
import type { LogSource } from './db'
import type { AllowedMimeType } from './constants'
import type { StoredImage } from './storage'
import type { TagItem } from './tags'
import { getTagsForImageKeys } from './tags'
import { getImageBaseUrl, isHideFolderInUrl } from './env'
import { toPublicImagePath } from './image-public-path'
import { getActiveBackendRow } from './storage/resolver'
import { getStorageBackendRow, getStorageBackendFromEnv } from './storage-backends'
import type { StorageBackendType, StorageBackendRow } from './storage/types'
import { buildObjectKey, parseS3Config } from './storage/s3'

export function attachTagsToImageItems(items: ImageItem[]): ImageItem[] {
  if (!items.length) return items
  const tagMap = getTagsForImageKeys(items.map(item => item.key))
  return items.map(item => ({
    ...item,
    tags: tagMap.get(item.key) ?? []
  }))
}

export type { TagItem }

export function resolveImageOwner(
  userId: number | null | undefined,
  ownerMap?: Map<number, string>
): ImageItem['owner'] | undefined {
  if (!ownerMap) return undefined

  if (userId == null) {
    return { userId: null, username: '系统/API' }
  }

  return {
    userId,
    username: ownerMap.get(userId) ?? `用户 #${userId}`
  }
}

export function resolveImageStorage(
  backendId: string | undefined,
  backendMap?: Map<string, { name: string, type: StorageBackendType }>
): ImageItem['storage'] | undefined {
  if (!backendId) return undefined

  const fromMap = backendMap?.get(backendId)
  if (fromMap) {
    return { id: backendId, name: fromMap.name, type: fromMap.type }
  }

  const row = getStorageBackendRow(backendId)
  if (row) {
    return { id: backendId, name: row.name, type: row.type }
  }

  return { id: backendId, name: backendId, type: 's3' }
}

export function mapStoredImageToItem(
  event: H3Event,
  stored: StoredImage,
  options?: {
    ownerMap?: Map<number, string>
    backendMap?: Map<string, { name: string, type: StorageBackendType }>
    sourceMap?: Map<string, LogSource>
  }
): ImageItem {
  const item = buildImageItem({
    key: stored.key,
    event,
    backendId: stored.backendId,
    originalName: stored.originalName,
    contentType: stored.contentType,
    size: stored.size,
    uploadedAt: stored.uploadedAt
  })

  const owner = resolveImageOwner(stored.userId, options?.ownerMap)
  const storage = resolveImageStorage(stored.backendId, options?.backendMap)
  const uploadSource = options?.sourceMap?.get(stored.key)

  return {
    ...item,
    ...(owner ? { owner } : {}),
    ...(storage ? { storage } : {}),
    ...(uploadSource === 'web' || uploadSource === 'api' ? { uploadSource } : {})
  }
}

export function buildImageUrl(
  baseUrl: string,
  key: string,
  hideFolder = false
): string {
  const normalizedBase = baseUrl.replace(/\/$/, '')
  const path = toPublicImagePath(key, hideFolder)
  return `${normalizedBase}/${path}`
}

export function buildPublicImageUrl(
  backendRow: StorageBackendRow,
  key: string,
  hideFolder = false
): string {
  const base = backendRow.public_url.replace(/\/$/, '')
  const path = toPublicImagePath(key, hideFolder)
  if (backendRow.type === 's3') {
    const config = parseS3Config(backendRow.config_json)
    const objectKey = buildObjectKey(config?.prefix, key)
    const publicPath = hideFolder ? toPublicImagePath(key, true) : objectKey
    return `${base}/${publicPath}`
  }
  return `${base}/${path}`
}

export function resolveImageUrl(
  event: H3Event,
  key: string,
  backendId?: string
): string {
  const hideFolder = isHideFolderInUrl(event)
  const envConfig = getStorageBackendFromEnv()
  if (envConfig && (!backendId || backendId === 's3-primary')) {
    if (envConfig.servingMode === 'public' && envConfig.publicUrl) {
      const prefix = envConfig.config.prefix as string | undefined
      const objectKey = buildObjectKey(prefix, key)
      const base = envConfig.publicUrl.replace(/\/$/, '')
      const publicPath = hideFolder ? toPublicImagePath(key, true) : objectKey
      return `${base}/${publicPath}`
    }
    return buildImageUrl(getImageBaseUrl(event), key, hideFolder)
  }

  const backendRow = backendId
    ? getStorageBackendRow(backendId)
    : getActiveBackendRow()

  if (backendRow?.serving_mode === 'public' && backendRow.public_url) {
    return buildPublicImageUrl(backendRow, key, hideFolder)
  }

  return buildImageUrl(getImageBaseUrl(event), key, hideFolder)
}

export function buildMarkdown(url: string, alt: string): string {
  const safeAlt = alt.replace(/[[\]]/g, '')
  return `![${safeAlt}](${url})`
}

export function buildHtml(url: string, alt: string): string {
  const safeAlt = escapeHtml(alt)
  const safeUrl = escapeHtml(url)
  return `<img src="${safeUrl}" alt="${safeAlt}">`
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

export function buildImageItem(input: {
  key: string
  baseUrl?: string
  event?: H3Event
  backendId?: string
  originalName: string
  contentType: AllowedMimeType | string
  size: number
  uploadedAt: string
}) {
  const url = input.event
    ? resolveImageUrl(input.event, input.key, input.backendId)
    : buildImageUrl(input.baseUrl ?? '', input.key)
  const alt = sanitizeOriginalName(input.originalName)

  return {
    key: input.key,
    url,
    originalName: alt,
    contentType: input.contentType,
    size: input.size,
    uploadedAt: input.uploadedAt,
    markdown: buildMarkdown(url, alt),
    html: buildHtml(url, alt)
  }
}

export function sanitizeOriginalName(name: string): string {
  const base = name.split(/[/\\]/).pop() ?? 'image'
  return base.replace(/[^\w.\-()]/g, '_').slice(0, 200) || 'image'
}
