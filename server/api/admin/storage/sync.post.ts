import { requireAdminAuth } from '../../../utils/access'
import { createApiError } from '../../../utils/api-error'
import { serializeBackupJob } from '../../../utils/backup/api'
import { previewBackendSync } from '../../../utils/backup/backend-sync'
import { startBackendSyncJob } from '../../../utils/backup/runner'

interface SyncBody {
  fromBackendId?: string
  toBackendId?: string
  deleteSource?: boolean
  setDefault?: boolean
  dryRun?: boolean
}

export default defineEventHandler(async (event) => {
  await requireAdminAuth(event)
  const body = await readBody<SyncBody>(event)

  const fromBackendId = body?.fromBackendId?.trim() ?? ''
  const toBackendId = body?.toBackendId?.trim() ?? ''
  if (!fromBackendId || !toBackendId) {
    createApiError(event, 'INVALID_REQUEST', '请选择源与目标存储后端', 400)
  }

  const options = {
    fromBackendId,
    toBackendId,
    deleteSource: Boolean(body?.deleteSource),
    setDefault: Boolean(body?.setDefault),
    dryRun: Boolean(body?.dryRun)
  }

  try {
    if (options.dryRun) {
      const preview = previewBackendSync(options)
      return { preview }
    }

    const job = startBackendSyncJob(options)
    return { job: serializeBackupJob(job) }
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'BACKUP_JOB_RUNNING') {
        createApiError(event, 'CONFLICT', '已有备份或迁移任务正在运行', 409)
      }
      createApiError(event, 'INVALID_REQUEST', error.message, 400)
    }
    throw error
  }
})
