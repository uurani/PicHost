import { requireUserAuth } from '../../utils/access'
import { logActivity } from '../../utils/activity-log'
import { createApiError } from '../../utils/api-error'
import { createTag } from '../../utils/tags'
import { handleTagApiError } from '../../utils/tag-api'

interface CreateTagBody {
  name?: string
  color?: string | null
}

export default defineEventHandler(async (event) => {
  const user = await requireUserAuth(event)
  const body = await readBody<CreateTagBody>(event)

  if (!body?.name || typeof body.name !== 'string') {
    createApiError(event, 'INVALID_REQUEST', '请提供标签名称', 400)
  }

  try {
    const tag = createTag(user.id, body.name, body.color)
    logActivity(event, {
      action: 'tags',
      key: `tags/${tag.id}`,
      originalName: tag.name,
      userId: user.id
    })
    return { tag }
  } catch (error) {
    handleTagApiError(event, error)
  }
})
