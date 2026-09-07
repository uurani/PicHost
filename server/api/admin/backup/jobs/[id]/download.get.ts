import { createReadStream } from 'node:fs'
import { basename } from 'node:path'
import { requireAdminAuth } from '../../../../../utils/access'
import { createApiError } from '../../../../../utils/api-error'
import { getBackupJob } from '../../../../../utils/backup/jobs'
import { BACKUP_ARCHIVE_EXT } from '../../../../../utils/backup/paths'

export default defineEventHandler(async (event) => {
  await requireAdminAuth(event)
  const id = getRouterParam(event, 'id')
  if (!id) {
    createApiError(event, 'INVALID_REQUEST', '缺少任务 ID', 400)
  }

  const job = getBackupJob(id)
  if (!job || job.type !== 'full_export' || job.status !== 'done' || !job.outputPath) {
    createApiError(event, 'INVALID_REQUEST', '可下载的备份不存在', 404)
  }

  const filename = basename(job.outputPath)
  if (!filename.endsWith(BACKUP_ARCHIVE_EXT)) {
    createApiError(event, 'INVALID_REQUEST', '备份文件无效', 404)
  }

  setResponseHeader(event, 'Content-Type', 'application/gzip')
  setResponseHeader(event, 'Content-Disposition', `attachment; filename="${filename}"`)

  return sendStream(event, createReadStream(job.outputPath))
})
