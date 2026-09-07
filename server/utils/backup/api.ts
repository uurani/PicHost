import type { BackupJob } from '../../utils/backup/jobs'
import { BACKUP_ARCHIVE_EXT } from '../../utils/backup/paths'

export function serializeBackupJob(job: BackupJob) {
  const archiveName = job.outputPath
    ? job.outputPath.split(/[/\\]/).pop()
    : typeof job.payload.archiveName === 'string'
      ? job.payload.archiveName
      : null

  return {
    id: job.id,
    type: job.type,
    status: job.status,
    progress: job.progress,
    total: job.total,
    message: job.message,
    payload: job.payload,
    outputPath: job.outputPath,
    archiveName,
    downloadable: Boolean(
      job.type === 'full_export'
      && job.status === 'done'
      && job.outputPath
      && archiveName?.endsWith(BACKUP_ARCHIVE_EXT)
    ),
    error: job.error,
    createdAt: job.createdAt,
    finishedAt: job.finishedAt
  }
}
