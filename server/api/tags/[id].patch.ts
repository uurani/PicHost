import { requireUserAuth } from '../../utils/access'
import { logActivity } from '../../utils/activity-log'
import { createApiError } from '../../utils/api-error'
import { updateTag } from '../../utils/tags'
import { handleTagApiError } from '../../utils/tag-api'

interface PatchTagBody {
  name?: string
  color?: string | null
}

export default defineEventHandler(async (event) => {
  const user = await requireUserAuth(event)
  const id = Number(getRouterParam(event, 'id'))

  if (!Number.isInteger(id) || id <= 0) {
    createApiError(event, 'INVALID_REQUEST', '无效的标签 ID', 400)
  }

  const body = await readBody<PatchTagBody>(event)
  if (body.name === undefined && body.color === undefined) {
    createApiError(event, 'INVALID_REQUEST', '请提供要更新的字段', 400)
  }

  try {
    const tag = updateTag(user.id, id, {
      name: body.name,
      color: body.color
    })
    logActivity(event, {
      action: 'edit',
      key: `tags/${tag.id}`,
      originalName: tag.name,
      userId: user.id
    })
    return { tag }
  } catch (error) {
    handleTagApiError(event, error)
  }
})
