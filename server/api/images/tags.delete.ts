import { requireApiOrAdminAuth } from '../../utils/access'
import { logActivity } from '../../utils/activity-log'
import { getCurrentUser } from '../../utils/auth'
import { createApiError } from '../../utils/api-error'
import { getImageIndexRow } from '../../utils/image-index'
import { toCanonicalImageKey, validateImageKey } from '../../utils/image-key'
import { removeTagFromImage } from '../../utils/tags'
import { handleTagApiError } from '../../utils/tag-api'

interface ImageTagDeleteBody {
  key?: string
  tagId?: number
}

export default defineEventHandler(async (event) => {
  await requireApiOrAdminAuth(event)
  const user = await getCurrentUser(event)

  const query = getQuery(event)
  const body = await readBody<ImageTagDeleteBody>(event).catch(() => ({} as ImageTagDeleteBody))

  const key = (typeof query.key === 'string' ? query.key : undefined) ?? body?.key?.trim()
  const tagId = Number(
    typeof query.tagId === 'string' ? query.tagId : body?.tagId
  )

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

  if (!Number.isInteger(tagId) || tagId <= 0) {
    createApiError(event, 'INVALID_REQUEST', '无效的标签 ID', 400)
  }

  try {
    const tags = removeTagFromImage(
      key,
      tagId,
      user!.id,
      user!.role === 'admin'
    )
    const indexed = getImageIndexRow(key)
    logActivity(event, {
      action: 'tags',
      key,
      originalName: indexed?.original_name ?? key,
      userId: user!.id
    })
    return { tags }
  } catch (error) {
    handleTagApiError(event, error)
  }
})
