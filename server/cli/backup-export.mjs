/**
 * Export a full PicHost site backup (.phost.tar.gz).
 *
 * Usage:
 *   node server/cli/backup-export.mjs
 *
 * Docker:
 *   docker exec pichost backup-export
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { loadServerModule } from './backup-cli-loader.mjs'

const { ensureBackupSchema } = loadServerModule('utils/backup/schema.ts')
const { createBackupJob, getBackupJob } = loadServerModule('utils/backup/jobs.ts')
const { runFullExportJob } = loadServerModule('utils/backup/full-export.ts')

function readAppVersion() {
  try {
    const pkg = JSON.parse(readFileSync(join(process.cwd(), 'package.json'), 'utf8'))
    return String(pkg.version ?? '0.0.0')
  } catch {
    return '0.0.0'
  }
}

async function main() {
  ensureBackupSchema()
  const job = createBackupJob({
    type: 'full_export',
    message: 'CLI 导出'
  })

  await runFullExportJob(job.id, readAppVersion())
  const done = getBackupJob(job.id)
  if (!done || done.status !== 'done') {
    console.error(`[PicHost] Export failed: ${done?.error ?? done?.message ?? 'unknown error'}`)
    process.exit(1)
  }

  console.log(`[PicHost] Export complete: ${done.outputPath}`)
}

main().catch((error) => {
  console.error(`[PicHost] Export error: ${error instanceof Error ? error.message : String(error)}`)
  process.exit(1)
})
