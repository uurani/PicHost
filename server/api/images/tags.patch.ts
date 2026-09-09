import { requireApiOrAdminAuth } from '../../utils/access'
import { logActivity } from '../../utils/activity-log'
import { getCurrentUser } from '../../utils/auth'
import { createApiError } from '../../utils/api-error'
import { getImageIndexRow } from '../../utils/image-index'
import { toCanonicalImageKey, validateImageKey } from '../../utils/image-key'
import { setImageTags } from '../../utils/tags'
import { handleTagApiError } from '../../utils/tag-api'

interface ImageTagsBody {
  key?: string
  tagIds?: number[]
}

export default defineEventHandler(async (event) => {
  await requireApiOrAdminAuth(event)
  const user = await getCurrentUser(event)
  const body = await readBody<ImageTagsBody>(event)

  const key = body?.key?.trim()
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

  const tagIds = Array.isArray(body?.tagIds)
    ? body.tagIds.filter(id => Number.isInteger(id) && id > 0)
    : []

  try {
    const tags = setImageTags(
      key,
      tagIds,
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
