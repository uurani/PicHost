/**
 * Sync images between storage backends.
 *
 * Usage:
 *   node server/cli/storage-sync.mjs --from <id> --to <id> [--delete-source] [--set-default] [--dry-run]
 *
 * Docker:
 *   docker exec pichost storage-sync --from local --to s3-xxx
 */
import { loadServerModule } from './backup-cli-loader.mjs'

const { ensureBackupSchema } = loadServerModule('utils/backup/schema.ts')
const { createBackupJob, getBackupJob } = loadServerModule('utils/backup/jobs.ts')
const { previewBackendSync, runBackendSyncJob } = loadServerModule('utils/backup/backend-sync.ts')

function usage() {
  console.error('Usage: storage-sync --from <backend-id> --to <backend-id> [--delete-source] [--set-default] [--dry-run]')
  process.exit(1)
}

function readArg(name) {
  const index = process.argv.indexOf(name)
  if (index < 0 || index + 1 >= process.argv.length) return ''
  return process.argv[index + 1]?.trim() ?? ''
}

const fromBackendId = readArg('--from')
const toBackendId = readArg('--to')
const deleteSource = process.argv.includes('--delete-source')
const setDefault = process.argv.includes('--set-default')
const dryRun = process.argv.includes('--dry-run')

if (!fromBackendId || !toBackendId) usage()

const options = {
  fromBackendId,
  toBackendId,
  deleteSource,
  setDefault,
  dryRun
}

async function main() {
  ensureBackupSchema()

  if (dryRun) {
    const preview = previewBackendSync(options)
    console.log(`[PicHost] Dry run: ${preview.imageCount} images, ${preview.imageBytes} bytes`)
    console.log(`[PicHost] From ${preview.fromBackendId} → ${preview.toBackendId}`)
    return
  }

  const job = createBackupJob({
    type: 'backend_sync',
    message: 'CLI 同步',
    payload: options
  })

  await runBackendSyncJob(job.id, options)
  const done = getBackupJob(job.id)
  if (!done || done.status !== 'done') {
    console.error(`[PicHost] Sync failed: ${done?.error ?? done?.message ?? 'unknown error'}`)
    process.exit(1)
  }

  console.log(`[PicHost] Sync complete: ${done.progress}/${done.total}`)
}

main().catch((error) => {
  console.error(`[PicHost] Sync error: ${error instanceof Error ? error.message : String(error)}`)
  process.exit(1)
})
