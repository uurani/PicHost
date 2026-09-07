import { join } from 'node:path'
import { getDataDir } from '../data-dir'

export const BACKUP_ARCHIVE_EXT = '.phost.tar.gz'

export function getBackupsDir(): string {
  return join(getDataDir(), 'backups')
}

export function getBackupStagingDir(jobId: string): string {
  return join(getBackupsDir(), 'staging', jobId)
}

export function isSafeBackupFilename(name: string): boolean {
  if (!name || name.includes('..') || name.includes('/') || name.includes('\\')) {
    return false
  }
  return name.endsWith(BACKUP_ARCHIVE_EXT)
}
