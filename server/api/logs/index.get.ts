import { requireUserAuth } from '../../utils/access'
import { createApiError } from '../../utils/api-error'
import { logException } from '../../utils/logger'
import {
  listActivityLogs,
  listUserIdUsernameMap,
  summarizeActivityLogs
} from '../../utils/db'
import { isLogAction, isLogSource } from '../../utils/activity-log'
import { ensureStorageSchema } from '../../utils/storage-backends'
import {
  DEFAULT_LIST_LIMIT,
  MAX_LIST_LIMIT
} from '../../utils/constants'

export default defineEventHandler(async (event) => {
  const user = await requireUserAuth(event)

  const query = getQuery(event)

  const limitRaw = Number(query.limit ?? DEFAULT_LIST_LIMIT)
  const limit = Number.isFinite(limitRaw)
    ? Math.min(Math.max(1, Math.floor(limitRaw)), MAX_LIST_LIMIT)
    : DEFAULT_LIST_LIMIT

  const actionRaw = typeof query.action === 'string' ? query.action : ''
  const action = isLogAction(actionRaw) ? actionRaw : undefined

  const sourceRaw = typeof query.source === 'string' ? query.source : ''
  const source = isLogSource(sourceRaw) ? sourceRaw : undefined

  const folder = typeof query.folder === 'string' && query.folder.trim()
    ? query.folder.trim()
    : undefined

  const searchRaw = typeof query.q === 'string' ? query.q.trim() : ''
  const search = searchRaw || undefined

  const dateFromRaw = typeof query.from === 'string' ? query.from.trim() : ''
  const dateToRaw = typeof query.to === 'string' ? query.to.trim() : ''
  const dateFrom = dateFromRaw && /^\d{4}-\d{2}-\d{2}$/.test(dateFromRaw)
    ? `${dateFromRaw}T00:00:00.000Z`
    : undefined
  const dateTo = dateToRaw && /^\d{4}-\d{2}-\d{2}$/.test(dateToRaw)
    ? (() => {
        const end = new Date(`${dateToRaw}T00:00:00.000Z`)
        end.setUTCDate(end.getUTCDate() + 1)
        return end.toISOString()
      })()
    : undefined

  const pageRaw = Number(query.page ?? 1)
  const page = Number.isFinite(pageRaw) && pageRaw > 0
    ? Math.floor(pageRaw)
    : 1

  let userId: number | undefined
  if (user.role === 'admin') {
    const userIdRaw = query.userId
    if (userIdRaw !== undefined && userIdRaw !== '' && userIdRaw !== 'all') {
      const parsed = Number(userIdRaw)
      if (!Number.isFinite(parsed) || parsed <= 0) {
        createApiError(event, 'INVALID_REQUEST', '无效的用户筛选', 400)
      }
      userId = Math.floor(parsed)
    }
  } else {
    userId = user.id
  }

  try {
    ensureStorageSchema()
    const result = listActivityLogs({
      limit,
      page,
      action,
      source,
      folder,
      userId,
      search,
      dateFrom,
      dateTo
    })
    const summary = summarizeActivityLogs({
      source,
      folder,
      userId,
      search,
      dateFrom,
      dateTo
    })
    const userMap = user.role === 'admin' ? listUserIdUsernameMap() : undefined

    return {
      items: result.items.map(row => ({
        id: row.id,
        action: row.action,
        key: row.key,
        originalName: row.original_name,
        size: row.size,
        contentType: row.content_type,
        source: row.source,
        userId: row.user_id,
        username: row.username,
        storage: row.backend_id
          ? {
              id: row.backend_id,
              name: row.backend_name ?? row.backend_id,
              type: (row.backend_type === 'local' ? 'local' : 's3') as 'local' | 's3'
            }
          : null,
        ipAddress: row.ip_address,
        status: row.status === 'failure' ? 'failure' : 'success',
        createdAt: row.created_at
      })),
      total: result.total,
      page: result.page,
      pageSize: result.pageSize,
      totalPages: result.totalPages,
      summary,
      users: userMap
        ? Array.from(userMap.entries())
            .map(([id, username]) => ({ id, username }))
            .sort((a, b) => a.username.localeCompare(b.username))
        : undefined
    }
  } catch (error) {
    logException('activity logs list failed', error)
    createApiError(event, 'INVALID_REQUEST', '读取操作记录失败', 500)
  }
})
