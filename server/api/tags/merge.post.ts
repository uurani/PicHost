import { requireUserAuth } from '../../utils/access'
import { logActivity } from '../../utils/activity-log'
import { createApiError } from '../../utils/api-error'
import { mergeTags } from '../../utils/tags'
import { handleTagApiError } from '../../utils/tag-api'

interface MergeTagsBody {
  sourceIds?: number[]
  targetId?: number
}

export default defineEventHandler(async (event) => {
  const user = await requireUserAuth(event)
  const body = await readBody<MergeTagsBody>(event)

  const sourceIds = Array.isArray(body?.sourceIds)
    ? body.sourceIds.filter(id => Number.isInteger(id) && id > 0)
    : []
  const targetId = Number(body?.targetId)

  if (!sourceIds.length || !Number.isInteger(targetId) || targetId <= 0) {
    createApiError(event, 'INVALID_REQUEST', '请提供有效的源标签与目标标签', 400)
  }

  try {
    const tag = mergeTags(user.id, sourceIds, targetId)
    logActivity(event, {
      action: 'tags',
      key: `tags/${tag.id}`,
      originalName: `合并标签 → ${tag.name}`,
      userId: user.id
    })
    return { tag }
  } catch (error) {
    handleTagApiError(event, error)
  }
})
