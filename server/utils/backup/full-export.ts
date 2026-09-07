import { createWriteStream, promises as fs } from 'node:fs'
import { join } from 'node:path'
import { pipeline } from 'node:stream/promises'
import * as tar from 'tar'
import { getImageTotals, listAllImageIndexRows } from '../image-index'
import {
  listStorageBackendRows
} from '../storage-backends'
import { parseS3Config } from '../storage/s3'
import { createImageStream } from '../storage'
import { copyDatabaseSnapshot } from './db-snapshot'
import { markJobDone, markJobFailed, updateBackupJob } from './jobs'
import { BACKUP_FORMAT_VERSION, type BackupManifest, type StorageBackendMetaExport } from './manifest'
import {
  BACKUP_ARCHIVE_EXT,
  getBackupStagingDir,
  getBackupsDir
} from './paths'
import type { StorageBackendRow } from '../storage/types'

function formatArchiveName(jobId: string): string {
  return `pichost-${jobId}${BACKUP_ARCHIVE_EXT}`
}

function buildStorageBackendsMeta(): StorageBackendMetaExport[] {
  return listStorageBackendRows().map((row: StorageBackendRow) => ({
    id: row.id,
    name: row.name,
    type: row.type,
    config: row.type === 's3' ? (parseS3Config(row.config_json) ?? {}) : {},
    servingMode: row.serving_mode,
    publicUrl: row.public_url,
    quotaBytes: row.quota_bytes,
    enabled: row.enabled === 1,
    isDefault: row.is_default === 1,
    sortOrder: row.sort_order
  }))
}

async function writeStreamToFile(stream: NodeJS.ReadableStream, filePath: string): Promise<void> {
  await fs.mkdir(join(filePath, '..'), { recursive: true })
  await pipeline(stream, createWriteStream(filePath))
}

export async function runFullExportJob(jobId: string, appVersion: string): Promise<void> {
  const stagingRoot = getBackupStagingDir(jobId)
  const archiveName = formatArchiveName(jobId)
  const archivePath = join(getBackupsDir(), archiveName)

  try {
    await fs.rm(stagingRoot, { recursive: true, force: true })
    await fs.mkdir(stagingRoot, { recursive: true })
    await fs.mkdir(getBackupsDir(), { recursive: true })

    const totals = getImageTotals()
    const rows = listAllImageIndexRows()
    updateBackupJob(jobId, {
      total: totals.count + 1,
      message: '正在备份数据库…'
    })

    await copyDatabaseSnapshot(join(stagingRoot, 'database', 'pichost.sqlite'))
    updateBackupJob(jobId, { progress: 1, message: '正在写入备份元数据…' })

    const manifest: BackupManifest = {
      formatVersion: BACKUP_FORMAT_VERSION,
      appVersion,
      createdAt: new Date().toISOString(),
      imageCount: totals.count,
      imageBytes: totals.bytes,
      includesDatabase: true
    }
    await fs.writeFile(
      join(stagingRoot, 'manifest.json'),
      JSON.stringify(manifest, null, 2),
      'utf8'
    )

    const metaDir = join(stagingRoot, 'meta')
    await fs.mkdir(metaDir, { recursive: true })
    await fs.writeFile(
      join(metaDir, 'storage_backends.json'),
      JSON.stringify(buildStorageBackendsMeta(), null, 2),
      'utf8'
    )
    await fs.writeFile(
      join(metaDir, 'readme.txt'),
      [
        'PicHost site backup package.',
        'Restore via Storage → Backup & migration in the admin UI.',
        'Object storage secrets are not included; re-enter keys after restore.'
      ].join('\n'),
      'utf8'
    )

    let processed = 1
    for (const row of rows) {
      updateBackupJob(jobId, {
        progress: processed,
        message: `正在导出图片 ${processed}/${totals.count + 1}…`
      })

      const blobPath = join(stagingRoot, 'blobs', row.key)
      const stream = await createImageStream(row.key)
      await writeStreamToFile(stream, blobPath)
      processed += 1
      updateBackupJob(jobId, { progress: processed })
    }

    updateBackupJob(jobId, { message: '正在压缩备份包…' })
    await tar.c(
      {
        gzip: true,
        file: archivePath,
        cwd: stagingRoot,
        portable: true
      },
      ['.']
    )

    await fs.rm(stagingRoot, { recursive: true, force: true })

    markJobDone(jobId, {
      message: '备份完成',
      outputPath: archivePath,
      payload: { archiveName }
    })
  } catch (error) {
    await fs.rm(stagingRoot, { recursive: true, force: true }).catch(() => {})
    const message = error instanceof Error ? error.message : '导出失败'
    markJobFailed(jobId, message)
    throw error
  }
}
