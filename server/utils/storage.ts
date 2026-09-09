import type { ReadStream } from 'node:fs'
import { promises as fs } from 'node:fs'
import { join } from 'node:path'
import type { Readable } from 'node:stream'
import { contentTypeFromKey } from './content-type'
import { getDataDir } from './data-dir'
import {
  countImages as countImagesFromIndex,
  deleteImageIndex,
  getFolderStorageStats as getFolderStorageStatsFromIndex,
  getImageIndexAsStored,
  getImageIndexRow,
  getUserScopedStorageStats as getUserScopedStorageStatsFromIndex,
  insertImageIndex,
  listFolders as listFoldersFromIndex,
  listFoldersForUser as listFoldersForUserFromIndex,
  listImageKeysForAutoDelete,
  listImages as listImagesFromIndex,
  searchImages as searchImagesFromIndex
} from './image-index'
import { DEFAULT_FOLDER, toCanonicalImageKey, validateImageKey } from './image-key'
import type { TagFilterInput } from './tags'
import {
  getActiveBackend,
  getBackendForKey
} from './storage/resolver'
import type {
  FolderStorageStat,
  PaginatedResult,
  StoredImage,
  StoredImageMeta
} from './storage/types'

export type {
  FolderStorageStat,
  PaginatedResult,
  StoredImage,
  StoredImageMeta
} from './storage/types'

export { getDataDir } from './data-dir'

function keyToFilePath(key: string): string {
  return join(getDataDir(), ...key.split('/'))
}

async function fileExistsAtKey(key: string): Promise<boolean> {
  try {
    await fs.access(keyToFilePath(key))
    return true
  } catch {
    return false
  }
}

/** 删除/变更前解析 key：接受遗留 blog/… 并映射到 images/blog/… */
export async function resolveStorageImageKey(key: string): Promise<string | null> {
  if (!key || typeof key !== 'string') return null

  if (validateImageKey(key)) {
    if (await fileExistsAtKey(key) || getImageIndexRow(key)) return key
    return null
  }

  if (getImageIndexRow(key)) {
    const canonical = toCanonicalImageKey(key)
    if (canonical && (await fileExistsAtKey(canonical) || getImageIndexRow(canonical))) {
      return canonical
    }
    if (await fileExistsAtKey(key)) return key
    return canonical ?? key
  }

  const canonical = toCanonicalImageKey(key)
  if (canonical && (await fileExistsAtKey(canonical) || getImageIndexRow(canonical))) {
    return canonical
  }

  return null
}

function deleteImageIndexAliases(storageKey: string, requestedKey?: string) {
  deleteImageIndex(storageKey)
  if (requestedKey && requestedKey !== storageKey) {
    deleteImageIndex(requestedKey)
  }
  if (storageKey.startsWith(`${DEFAULT_FOLDER}/`)) {
    const legacy = storageKey.slice(DEFAULT_FOLDER.length + 1)
    if (legacy && legacy !== storageKey) {
      deleteImageIndex(legacy)
    }
  }
}

export async function putImage(
  key: string,
  bytes: Uint8Array,
  meta: StoredImageMeta
): Promise<string> {
  const backend = await getActiveBackend()
  await backend.put(key, bytes, meta)
  insertImageIndex({
    key,
    backendId: backend.id,
    userId: meta.userId,
    originalName: meta.originalName,
    contentType: meta.contentType,
    size: meta.size,
    uploadedAt: meta.uploadedAt
  })
  return backend.id
}

export async function headImage(key: string): Promise<StoredImage | null> {
  const backend = await getBackendForKey(key)
  const stored = await backend.head(key)
  if (!stored) return null

  const indexed = getImageIndexAsStored(key)
  if (indexed) {
    let contentType = indexed.contentType
    if (contentType === 'application/octet-stream') {
      contentType = stored.contentType !== 'application/octet-stream'
        ? stored.contentType
        : contentTypeFromKey(key)
    }
    return {
      ...stored,
      backendId: backend.id,
      originalName: indexed.originalName,
      contentType,
      uploadedAt: indexed.uploadedAt,
      userId: indexed.userId
    }
  }

  insertImageIndex({
    key: stored.key,
    backendId: backend.id,
    userId: stored.userId,
    originalName: stored.originalName,
    contentType: stored.contentType,
    size: stored.size,
    uploadedAt: stored.uploadedAt
  })

  return { ...stored, backendId: backend.id }
}

export async function createImageStream(
  key: string,
  range?: { start: number, end: number }
): Promise<ReadStream | Readable> {
  const backend = await getBackendForKey(key)
  return backend.createStream(key, range)
}

export async function deleteImage(key: string, requestedKey?: string): Promise<void> {
  const backend = await getBackendForKey(key)
  await backend.delete(key)
  deleteImageIndexAliases(key, requestedKey)
}

export async function listFolders(): Promise<string[]> {
  return listFoldersFromIndex()
}

export async function listImageKeys(): Promise<string[]> {
  const images = await listImageKeysForAutoDelete()
  return images.map(image => image.key)
}

export async function countImages(
  userFilter?: number | 'admin',
  backendId?: string,
  tagFilter?: TagFilterInput
): Promise<number> {
  return countImagesFromIndex(userFilter, backendId, tagFilter)
}

export async function getFolderStorageStats(
  userFilter?: number | 'admin',
  tagFilter?: TagFilterInput
): Promise<FolderStorageStat[]> {
  return getFolderStorageStatsFromIndex(userFilter, tagFilter)
}

export async function listFoldersForUser(
  userFilter?: number | 'admin'
): Promise<string[]> {
  return listFoldersForUserFromIndex(userFilter)
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
  byFolder: FolderStorageStat[]
}> {
  return getUserScopedStorageStatsFromIndex(userId, tagFilter)
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
  return listImagesFromIndex(options)
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
  return searchImagesFromIndex(options)
}
