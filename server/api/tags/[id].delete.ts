import { requireUserAuth } from '../../utils/access'
import { logActivity } from '../../utils/activity-log'
import { createApiError } from '../../utils/api-error'
import { deleteTag, getTagForUser } from '../../utils/tags'

export default defineEventHandler(async (event) => {
  const user = await requireUserAuth(event)
  const id = Number(getRouterParam(event, 'id'))

  if (!Number.isInteger(id) || id <= 0) {
    createApiError(event, 'INVALID_REQUEST', '无效的标签 ID', 400)
  }

  const existing = getTagForUser(user.id, id)
  if (!existing) {
    createApiError(event, 'INVALID_REQUEST', '标签不存在', 404)
  }

  const deleted = deleteTag(user.id, id)
  if (!deleted) {
    createApiError(event, 'INVALID_REQUEST', '标签不存在', 404)
  }

  logActivity(event, {
    action: 'tags',
    key: `tags/${id}`,
    originalName: existing.name,
    userId: user.id
  })

  return { success: true }
})
