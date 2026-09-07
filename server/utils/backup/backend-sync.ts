import { promises as fs } from 'node:fs'
import { join } from 'node:path'
import {
  createBackendInstance,
  getStorageBackendRow,
  setDefaultBackend
} from '../storage-backends'
import {
  getImageIndexAsStored,
  listImageIndexRowsByBackend,
  updateImageBackendId
} from '../image-index'
import { createImageStream } from '../storage'
import { getBackupJob, markJobDone, markJobFailed, updateBackupJob } from './jobs'
import { getBackupStagingDir } from './paths'

export interface BackendSyncOptions {
  fromBackendId: string
  toBackendId: string
  deleteSource?: boolean
  setDefault?: boolean
  dryRun?: boolean
}

export interface BackendSyncPreview {
  imageCount: number
  imageBytes: number
  fromBackendId: string
  toBackendId: string
}

export function previewBackendSync(options: BackendSyncOptions): BackendSyncPreview {
  const fromRow = getStorageBackendRow(options.fromBackendId)
  const toRow = getStorageBackendRow(options.toBackendId)
  if (!fromRow) {
    throw new Error('源存储后端不存在')
  }
  if (!toRow) {
    throw new Error('目标存储后端不存在')
  }
  if (!toRow.enabled) {
    throw new Error('目标存储后端未启用')
  }
  if (options.fromBackendId === options.toBackendId) {
    throw new Error('源与目标存储后端不能相同')
  }

  const rows = listImageIndexRowsByBackend(options.fromBackendId)
  const imageBytes = rows.reduce((sum, row) => sum + row.size, 0)
  return {
    imageCount: rows.length,
    imageBytes,
    fromBackendId: options.fromBackendId,
    toBackendId: options.toBackendId
  }
}

async function streamToBuffer(stream: NodeJS.ReadableStream): Promise<Buffer> {
  const chunks: Buffer[] = []
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  }
  return Buffer.concat(chunks)
}

export async function runBackendSyncJob(
  jobId: string,
  options: BackendSyncOptions
): Promise<void> {
  const preview = previewBackendSync(options)
  if (options.dryRun) {
    markJobDone(jobId, {
      message: '预检完成',
      payload: { preview }
    })
    return
  }

  const fromRow = getStorageBackendRow(options.fromBackendId)!
  const toRow = getStorageBackendRow(options.toBackendId)!
  const fromBackend = createBackendInstance(fromRow)
  const toBackend = createBackendInstance(toRow)

  const rows = listImageIndexRowsByBackend(options.fromBackendId)
  const failedKeys: string[] = []
  const failedLogPath = join(getBackupStagingDir(jobId), 'failed_keys.jsonl')

  updateBackupJob(jobId, {
    total: rows.length,
    progress: 0,
    message: '正在同步图片…'
  })

  let processed = 0
  for (const row of rows) {
    try {
      const stream = await createImageStream(row.key)
      const bytes = await streamToBuffer(stream)
      await toBackend.put(row.key, bytes, {
        originalName: row.original_name,
        uploadedAt: row.uploaded_at,
        contentType: row.content_type,
        size: row.size,
        userId: row.user_id
      })

      const head = await toBackend.head(row.key)
      if (!head) {
        throw new Error('目标后端写入校验失败')
      }

      updateImageBackendId(row.key, options.toBackendId)

      if (options.deleteSource) {
        await fromBackend.delete(row.key)
      }
    } catch (error) {
      failedKeys.push(row.key)
      await fs.mkdir(join(failedLogPath, '..'), { recursive: true }).catch(() => {})
      await fs.appendFile(
        failedLogPath,
        `${row.key}\t${error instanceof Error ? error.message : 'unknown'}\n`,
        'utf8'
      ).catch(() => {})
    }

    processed += 1
    updateBackupJob(jobId, {
      progress: processed,
      message: `正在同步 ${processed}/${rows.length}…`
    })
  }

  if (options.setDefault) {
    setDefaultBackend(options.toBackendId)
  }

  if (failedKeys.length > 0) {
    markJobFailed(jobId, `${failedKeys.length} 张图片同步失败`, `部分失败：${failedKeys.length}/${rows.length}`)
    updateBackupJob(jobId, {
      payload: { failedKeys, failedLogPath, preview }
    })
    return
  }

  markJobDone(jobId, {
    message: '同步完成',
    payload: { preview, synced: rows.length }
  })
}

export async function retryFailedBackendSync(jobId: string): Promise<void> {
  const failedLogPath = join(getBackupStagingDir(jobId), 'failed_keys.jsonl')
  let raw: string
  try {
    raw = await fs.readFile(failedLogPath, 'utf8')
  } catch {
    throw new Error('没有可重试的失败记录')
  }

  const keys = raw
    .split('\n')
    .map(line => line.split('\t')[0]?.trim())
    .filter((key): key is string => Boolean(key))

  const job = getBackupJob(jobId)
  if (!job) throw new Error('任务不存在')

  const fromBackendId = String(job.payload.fromBackendId ?? '')
  const toBackendId = String(job.payload.toBackendId ?? '')
  const deleteSource = Boolean(job.payload.deleteSource)
  const fromRow = getStorageBackendRow(fromBackendId)
  const toRow = getStorageBackendRow(toBackendId)
  if (!fromRow || !toRow) throw new Error('存储后端配置无效')

  const fromBackend = createBackendInstance(fromRow)
  const toBackend = createBackendInstance(toRow)

  const stillFailed: string[] = []
  for (const key of keys) {
    const row = getImageIndexAsStored(key)
    if (!row) continue
    try {
      const stream = await createImageStream(key)
      const bytes = await streamToBuffer(stream)
      await toBackend.put(key, bytes, {
        originalName: row.originalName,
        uploadedAt: row.uploadedAt,
        contentType: row.contentType,
        size: row.size,
        userId: row.userId
      })
      updateImageBackendId(key, toBackendId)
      if (deleteSource) {
        await fromBackend.delete(key)
      }
    } catch {
      stillFailed.push(key)
    }
  }

  if (stillFailed.length > 0) {
    await fs.writeFile(
      failedLogPath,
      stillFailed.map(key => `${key}\tretry failed\n`).join(''),
      'utf8'
    )
    throw new Error(`仍有 ${stillFailed.length} 张图片同步失败`)
  }

  await fs.rm(failedLogPath, { force: true }).catch(() => {})
  markJobDone(jobId, { message: '失败项重试完成' })
}
