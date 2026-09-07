import { createApiError } from '../../utils/api-error'
import { isInitialized } from '../../utils/auth'
import { serializeBackupJob } from '../../utils/backup/api'
import { startFullRestoreJob } from '../../utils/backup/runner'
import { BACKUP_ARCHIVE_EXT, getBackupsDir } from '../../utils/backup/paths'
import { join } from 'node:path'
import { promises as fs } from 'node:fs'

export default defineEventHandler(async (event) => {
  if (isInitialized()) {
    createApiError(event, 'FORBIDDEN', '系统已初始化，请在存储页恢复备份', 403)
  }

  const form = await readMultipartFormData(event)
  const filePart = form?.find(part => part.name === 'file' && part.data?.length)
  if (!filePart?.data) {
    createApiError(event, 'INVALID_REQUEST', '请上传备份文件', 400)
  }

  await fs.mkdir(getBackupsDir(), { recursive: true })
  const archivePath = join(getBackupsDir(), `setup-restore-${Date.now()}${BACKUP_ARCHIVE_EXT}`)
  await fs.writeFile(archivePath, filePart.data)

  try {
    const job = startFullRestoreJob(archivePath, 'overwrite')
    return {
      job: serializeBackupJob(job),
      message: '恢复任务已开始，完成后请使用备份中的管理员账号登录'
    }
  } catch (error) {
    if (error instanceof Error && error.message === 'BACKUP_JOB_RUNNING') {
      createApiError(event, 'CONFLICT', '已有备份或迁移任务正在运行', 409)
    }
    throw error
  }
})
