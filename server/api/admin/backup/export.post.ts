import { requireAdminAuth } from '../../../utils/access'
import { createApiError } from '../../../utils/api-error'
import { serializeBackupJob } from '../../../utils/backup/api'
import { getBackupExportEstimate } from '../../../utils/backup/stats'
import { startFullExportJob } from '../../../utils/backup/runner'

export default defineEventHandler(async (event) => {
  await requireAdminAuth(event)
  const config = useRuntimeConfig(event)
  const appVersion = String(config.appVersion ?? '0.0.0')

  const estimate = await getBackupExportEstimate()

  try {
    const job = startFullExportJob(appVersion)
    return {
      job: serializeBackupJob(job),
      estimate
    }
  } catch (error) {
    if (error instanceof Error && error.message === 'BACKUP_JOB_RUNNING') {
      createApiError(event, 'CONFLICT', '已有备份或迁移任务正在运行', 409)
    }
    throw error
  }
})
