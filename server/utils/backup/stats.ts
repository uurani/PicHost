import { stat } from 'node:fs/promises'
import { join } from 'node:path'
import { getDataDir } from '../data-dir'
import { getImageTotals } from '../image-index'
import { getBackupsDir } from './paths'

export async function getBackupExportEstimate(): Promise<{
  imageCount: number
  imageBytes: number
  databaseBytes: number
  totalBytes: number
}> {
  const { count, bytes } = getImageTotals()
  const databaseBytes = await (async () => {
    try {
      const dbStat = await stat(join(getDataDir(), 'pichost.db'))
      return dbStat.size
    } catch {
      return 0
    }
  })()
  return {
    imageCount: count,
    imageBytes: bytes,
    databaseBytes,
    totalBytes: bytes + databaseBytes
  }
}

export async function getAvailableDiskBytes(): Promise<number | null> {
  try {
    const { statfs } = await import('node:fs/promises')
    const stats = await statfs(getBackupsDir())
    return Number(stats.bavail) * Number(stats.bsize)
  } catch {
    return null
  }
}
