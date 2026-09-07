import { requireAdminAuth } from '../../../../../utils/access'
import { createApiError } from '../../../../../utils/api-error'
import { serializeBackupJob } from '../../../../../utils/backup/api'
import { getBackupJob } from '../../../../../utils/backup/jobs'
import { cancelBackupJob } from '../../../../../utils/backup/runner'

export default defineEventHandler(async (event) => {
  await requireAdminAuth(event)
  const id = getRouterParam(event, 'id')
  if (!id) {
    createApiError(event, 'INVALID_REQUEST', '缺少任务 ID', 400)
  }

  if (!cancelBackupJob(id)) {
    createApiError(event, 'INVALID_REQUEST', '只能取消进行中的任务', 400)
  }

  const job = getBackupJob(id)
  return { job: job ? serializeBackupJob(job) : null }
})
