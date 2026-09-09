import type { DeleteResponse } from '~/types/image'
import { requireApiOrAdminAuth, assertImageOwnership } from '../../utils/access'
import { createApiError } from '../../utils/api-error'
import { logActivity } from '../../utils/activity-log'
import { getImageIndexRow, deleteImageIndex } from '../../utils/image-index'
import { toCanonicalImageKey, validateImageKey } from '../../utils/image-key'
import { deleteImage, headImage, resolveStorageImageKey } from '../../utils/storage'
import { logInfo } from '../../utils/logger'

interface DeleteBody {
  key?: string
}

export default defineEventHandler(async (event) => {
  try {
    await requireApiOrAdminAuth(event)

    const query = getQuery(event)
    const body = await readBody<DeleteBody>(event).catch(() => null)
    const key = (typeof query.key === 'string' ? query.key : undefined)
      ?? body?.key

    if (
      !key
      || (
        !validateImageKey(key)
        && !toCanonicalImageKey(key)
        && !getImageIndexRow(key)
      )
    ) {
      createApiError(event, 'INVALID_IMAGE_KEY', '无效的图片路径', 400)
    }

    const storageKey = await resolveStorageImageKey(key) ?? key
    const existing = await headImage(storageKey)
    const indexed = getImageIndexRow(key) ?? getImageIndexRow(storageKey)

    if (!existing && indexed) {
      await assertImageOwnership(event, indexed.user_id)
      deleteImageIndex(key)
      if (storageKey !== key) deleteImageIndex(storageKey)

      logActivity(event, {
        action: 'delete',
        key,
        originalName: indexed.original_name,
        size: indexed.size,
        contentType: indexed.content_type,
        userId: indexed.user_id ?? null,
        backendId: indexed.backend_id ?? null
      })

      logInfo('delete orphan index', { key })

      const response: DeleteResponse = { success: true }
      return response
    }

    if (!existing) {
      createApiError(event, 'IMAGE_NOT_FOUND', '图片不存在', 404)
    }

    await assertImageOwnership(event, existing.userId)

    try {
      await deleteImage(storageKey, key)
    } catch {
      createApiError(event, 'DELETE_FAILED', '删除失败', 500)
    }

    logActivity(event, {
      action: 'delete',
      key,
      originalName: existing.originalName,
      size: existing.size,
      contentType: existing.contentType,
      userId: existing.userId ?? null,
      backendId: existing.backendId ?? null
    })

    logInfo('delete success', { key: storageKey, size: existing.size })

    const response: DeleteResponse = { success: true }
    return response
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error
    }
    createApiError(event, 'DELETE_FAILED', '删除失败', 500)
  }
})
