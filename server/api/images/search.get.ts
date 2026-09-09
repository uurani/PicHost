import type { ImageListResponse } from '~/types/image'
import { requireApiOrAdminAuth, getImageUserFilter } from '../../utils/access'
import { getCurrentUser } from '../../utils/auth'
import {
  DEFAULT_LIST_LIMIT,
  MAX_LIST_LIMIT
} from '../../utils/constants'
import { createApiError } from '../../utils/api-error'
import { getUploadSourcesForKeys, listUserIdUsernameMap } from '../../utils/db'
import { mapStoredImageToItem, attachTagsToImageItems } from '../../utils/image-response'
import { listStorageBackendNameMap } from '../../utils/storage-backends'
import { readBackendIdQuery, readContentTypeQuery, readTagFilterQuery, readUploadSourceQuery } from '../../utils/image-query'
import { searchImages } from '../../utils/storage'

export default defineEventHandler(async (event) => {
  await requireApiOrAdminAuth(event)

  const query = getQuery(event)
  const q = typeof query.q === 'string' ? query.q.trim() : ''

  if (!q) {
    createApiError(event, 'INVALID_REQUEST', '请提供搜索关键词 q', 400)
  }

  if (q.length > 200) {
    createApiError(event, 'INVALID_REQUEST', '搜索关键词过长', 400)
  }

  const limitRaw = Number(query.limit ?? DEFAULT_LIST_LIMIT)
  const limit = Number.isFinite(limitRaw)
    ? Math.min(Math.max(1, Math.floor(limitRaw)), MAX_LIST_LIMIT)
    : DEFAULT_LIST_LIMIT

  const pageRaw = Number(query.page ?? 1)
  const page = Number.isFinite(pageRaw) && pageRaw > 0
    ? Math.floor(pageRaw)
    : 1

  const backendId = readBackendIdQuery(query)
  if (backendId === null) {
    createApiError(event, 'INVALID_REQUEST', '无效的存储后端', 400)
  }
  const contentType = readContentTypeQuery(query)
  if (contentType === null) {
    createApiError(event, 'INVALID_REQUEST', '无效的图片类型', 400)
  }
  const uploadSource = readUploadSourceQuery(query)
  if (uploadSource === null) {
    createApiError(event, 'INVALID_REQUEST', '无效的上传来源', 400)
  }
  const tagFilter = readTagFilterQuery(query)
  if (tagFilter === null) {
    createApiError(event, 'INVALID_REQUEST', '无效的标签筛选参数', 400)
  }
  const userFilter = await getImageUserFilter(event)

  const result = await searchImages({
    query: q,
    limit,
    page,
    userFilter,
    backendId,
    contentType,
    uploadSource,
    tagFilter
  })

  const user = await getCurrentUser(event)
  const ownerMap = user?.role === 'admin' ? listUserIdUsernameMap() : undefined
  const backendMap = listStorageBackendNameMap()
  const sourceMap = getUploadSourcesForKeys(result.items.map(item => item.key))
  const items = attachTagsToImageItems(
    result.items.map(stored =>
      mapStoredImageToItem(event, stored, { ownerMap, backendMap, sourceMap })
    )
  )

  items.sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt))

  const response: ImageListResponse = {
    items,
    total: result.total,
    page: result.page,
    pageSize: result.pageSize,
    totalPages: result.totalPages
  }

  return response
})
