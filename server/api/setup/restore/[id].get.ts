import { createApiError } from '../../../utils/api-error'
import { serializeBackupJob } from '../../../utils/backup/api'
import { getBackupJob } from '../../../utils/backup/jobs'

export default defineEventHandler((event) => {
  const id = getRouterParam(event, 'id')
  if (!id) {
    createApiError(event, 'INVALID_REQUEST', '缺少任务 ID', 400)
  }

  const job = getBackupJob(id)
  if (!job || job.type !== 'full_restore') {
    createApiError(event, 'INVALID_REQUEST', '任务不存在', 404)
  }

  return { job: serializeBackupJob(job) }
})
