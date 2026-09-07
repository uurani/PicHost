import { requireAdminAuth } from '../../../utils/access'
import { getBackupExportEstimate } from '../../../utils/backup/stats'
import { getBackupsDir, isSafeBackupFilename } from '../../../utils/backup/paths'
import { promises as fs } from 'node:fs'
import { join } from 'node:path'

export default defineEventHandler(async (event) => {
  await requireAdminAuth(event)
  const estimate = await getBackupExportEstimate()

  const packages = await (async () => {
    try {
      await fs.mkdir(getBackupsDir(), { recursive: true })
      const entries = await fs.readdir(getBackupsDir(), { withFileTypes: true })
      const items = await Promise.all(
        entries
          .filter(entry => entry.isFile() && isSafeBackupFilename(entry.name))
          .map(async (entry) => {
            const full = join(getBackupsDir(), entry.name)
            const fileStat = await fs.stat(full)
            return {
              name: entry.name,
              bytes: fileStat.size,
              modifiedAt: fileStat.mtime.toISOString()
            }
          })
      )
      items.sort((a, b) => b.modifiedAt.localeCompare(a.modifiedAt))
      return items
    } catch {
      return []
    }
  })()

  return {
    estimate,
    backupsDir: getBackupsDir(),
    packages
  }
})
