import type { H3Event } from 'h3'
import { requireAdminAuth } from '../../../utils/access'
import { createApiError } from '../../../utils/api-error'
import { serializeBackupJob } from '../../../utils/backup/api'
import { previewFullRestore } from '../../../utils/backup/full-restore'
import { startFullRestoreJob } from '../../../utils/backup/runner'
import {
  BACKUP_ARCHIVE_EXT,
  getBackupsDir,
  getBackupStagingDir,
  isSafeBackupFilename
} from '../../../utils/backup/paths'
import { join } from 'node:path'
import { promises as fs } from 'node:fs'

interface RestoreBody {
  archiveName?: string
  conflictMode?: 'skip' | 'overwrite'
  dryRun?: boolean
}

async function resolveRestoreInput(event: H3Event): Promise<{
  archivePath: string
  body: RestoreBody
  cleanup?: () => Promise<void>
}> {
  const contentType = getHeader(event, 'content-type') ?? ''

  if (contentType.includes('multipart/form-data')) {
    const form = await readMultipartFormData(event)
    const filePart = form?.find(part => part.name === 'file' && part.data?.length)
    if (!filePart?.data) {
      createApiError(event, 'INVALID_REQUEST', '请上传备份文件', 400)
    }

    const conflictField = form?.find(part => part.name === 'conflictMode')?.data?.toString('utf8')
    const dryRunField = form?.find(part => part.name === 'dryRun')?.data?.toString('utf8')
    const dryRun = dryRunField === 'true'

    if (dryRun) {
      const tempDir = getBackupStagingDir(`upload-preview-${Date.now()}`)
      await fs.mkdir(tempDir, { recursive: true })
      const archivePath = join(tempDir, 'package.phost.tar.gz')
      await fs.writeFile(archivePath, filePart.data)
      return {
        archivePath,
        body: {
          conflictMode: conflictField === 'skip' ? 'skip' : 'overwrite',
          dryRun: true
        },
        cleanup: async () => {
          await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {})
        }
      }
    }

    await fs.mkdir(getBackupsDir(), { recursive: true })
    const safeName = `upload-${Date.now()}${BACKUP_ARCHIVE_EXT}`
    const archivePath = join(getBackupsDir(), safeName)
    await fs.writeFile(archivePath, filePart.data)
    return {
      archivePath,
      body: {
        conflictMode: conflictField === 'skip' ? 'skip' : 'overwrite',
        dryRun: false
      }
    }
  }

  const body = await readBody<RestoreBody>(event)
  if (!body?.archiveName || !isSafeBackupFilename(body.archiveName)) {
    createApiError(event, 'INVALID_REQUEST', '请选择有效的备份文件', 400)
  }
  const archivePath = join(getBackupsDir(), body.archiveName)
  try {
    await fs.access(archivePath)
  } catch {
    createApiError(event, 'INVALID_REQUEST', '备份文件不存在', 400)
  }
  return { archivePath, body }
}

export default defineEventHandler(async (event) => {
  await requireAdminAuth(event)

  const { archivePath, body, cleanup } = await resolveRestoreInput(event)

  const conflictMode = body.conflictMode === 'skip' ? 'skip' : 'overwrite'

  if (body.dryRun) {
    try {
      const preview = await previewFullRestore(archivePath)
      return { preview }
    } finally {
      await cleanup?.()
    }
  }

  try {
    const job = startFullRestoreJob(archivePath, conflictMode)
    return { job: serializeBackupJob(job) }
  } catch (error) {
    if (error instanceof Error && error.message === 'BACKUP_JOB_RUNNING') {
      createApiError(event, 'CONFLICT', '已有备份或迁移任务正在运行', 409)
    }
    throw error
  }
})
