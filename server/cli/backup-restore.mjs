/**
 * Restore PicHost from a .phost.tar.gz backup.
 *
 * Usage:
 *   node server/cli/backup-restore.mjs <archive-path> [--overwrite]
 *
 * Docker:
 *   docker exec pichost backup-restore /app/data/backups/pichost-xxx.phost.tar.gz
 */
import { access } from 'node:fs/promises'
import { resolve } from 'node:path'
import { loadServerModule } from './backup-cli-loader.mjs'

const { ensureBackupSchema } = loadServerModule('utils/backup/schema.ts')
const { createBackupJob, getBackupJob } = loadServerModule('utils/backup/jobs.ts')
const { previewFullRestore } = loadServerModule('utils/backup/full-restore.ts')
const { runFullRestoreJob } = loadServerModule('utils/backup/full-restore.ts')

function usage() {
  console.error('Usage: backup-restore <archive-path> [--overwrite]')
  process.exit(1)
}

const args = process.argv.slice(2).filter(arg => arg !== '--')
if (!args.length) usage()

const overwrite = args.includes('--overwrite')
const archiveArg = args.find(arg => arg !== '--overwrite')
if (!archiveArg) usage()

const archivePath = resolve(archiveArg)
const conflictMode = overwrite ? 'overwrite' : 'skip'

async function main() {
  try {
    await access(archivePath)
  } catch {
    console.error(`[PicHost] Backup file not found: ${archivePath}`)
    process.exit(1)
  }

  ensureBackupSchema()
  const preview = await previewFullRestore(archivePath)
  console.log(`[PicHost] Preview: ${preview.imageCount} images, ${preview.newImages} new, ${preview.conflictingImages} conflicts`)

  const job = createBackupJob({
    type: 'full_restore',
    message: 'CLI 恢复',
    payload: { archivePath, conflictMode }
  })

  await runFullRestoreJob(job.id, archivePath, { conflictMode })
  const done = getBackupJob(job.id)
  if (!done || done.status !== 'done') {
    console.error(`[PicHost] Restore failed: ${done?.error ?? done?.message ?? 'unknown error'}`)
    process.exit(1)
  }

  console.log('[PicHost] Restore complete. Restart PicHost if it is running.')
}

main().catch((error) => {
  console.error(`[PicHost] Restore error: ${error instanceof Error ? error.message : String(error)}`)
  process.exit(1)
})
