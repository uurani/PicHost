import { requireAdminAuth } from '../../../../../utils/access'
import { createApiError } from '../../../../../utils/api-error'
import { retryFailedBackendSync } from '../../../../../utils/backup/backend-sync'
import { serializeBackupJob } from '../../../../../utils/backup/api'
import { getBackupJob } from '../../../../../utils/backup/jobs'

export default defineEventHandler(async (event) => {
  await requireAdminAuth(event)
  const id = getRouterParam(event, 'id')
  if (!id) {
    createApiError(event, 'INVALID_REQUEST', '缺少任务 ID', 400)
  }

  const job = getBackupJob(id)
  if (!job || job.type !== 'backend_sync') {
    createApiError(event, 'INVALID_REQUEST', '任务不存在', 404)
  }

  try {
    await retryFailedBackendSync(id)
  } catch (error) {
    const message = error instanceof Error ? error.message : '重试失败'
    createApiError(event, 'INVALID_REQUEST', message, 400)
  }

  const updated = getBackupJob(id)
  return { job: updated ? serializeBackupJob(updated) : null }
})
