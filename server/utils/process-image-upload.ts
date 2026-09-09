import sharp from 'sharp'
import type { H3Event } from 'h3'
import type { ImageItem, UploadErrorItem } from '~/types/image'
import type { AllowedMimeType } from './constants'
import {
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE
} from './constants'
import {
  detectMimeFromSignature,
  isAllowedMimeType,
  validateFileSignature
} from './file-signature'
import type { LogSource } from './db'
import { generateImageKey } from './image-key'
import { buildImageItem, sanitizeOriginalName } from './image-response'
import { getStorageLayout, getWebpQuality } from './env'
import { logActivity } from './activity-log'
import { attachTagsAfterUpload, getTagsForImageKeys } from './tags'
import { putImage } from './storage'
import { logInfo, logException } from './logger'

/** 可转 WebP 的位图格式；SVG（矢量）、ICO、已是 WebP 的原样存储 */
const WEBP_CONVERTIBLE: readonly AllowedMimeType[] = [
  'image/jpeg',
  'image/png',
  'image/gif'
]

/**
 * 服务端统一转 WebP（浏览器直传、Twikoo/EasyImage、油猴脚本一视同仁）。
 * 转换失败或转出来更大时，保留原格式存储。
 */
async function compressToWebp(
  bytes: Uint8Array,
  mime: AllowedMimeType,
  quality: number
): Promise<{ bytes: Uint8Array, mime: AllowedMimeType }> {
  if (!WEBP_CONVERTIBLE.includes(mime)) {
    return { bytes, mime }
  }

  try {
    const output = await sharp(Buffer.from(bytes), {
      // GIF 保留动画帧
      animated: mime === 'image/gif'
    })
      .webp({ quality })
      .toBuffer()

    if (output.byteLength >= bytes.byteLength) {
      return { bytes, mime }
    }

    return { bytes: new Uint8Array(output), mime: 'image/webp' }
  } catch {
    return { bytes, mime }
  }
}

export async function processSingleImageUpload(
  event: H3Event,
  input: {
    bytes: Uint8Array
    filename?: string
    source?: LogSource
    userId?: number | null
    tagIds?: number[]
  }
): Promise<{ item: ImageItem } | { error: UploadErrorItem }> {
  const originalName = sanitizeOriginalName(input.filename ?? 'image')
  const bytes = input.bytes

  if (bytes.byteLength > MAX_FILE_SIZE) {
    return {
      error: {
        name: originalName,
        error: {
          code: 'FILE_TOO_LARGE',
          message: '图片大小不能超过 10 MB'
        }
      }
    }
  }

  const detectedMime = detectMimeFromSignature(bytes)
  if (!detectedMime) {
    return {
      error: {
        name: originalName,
        error: {
          code: 'INVALID_FILE_SIGNATURE',
          message: '无法识别的图片格式'
        }
      }
    }
  }

  if (!ALLOWED_MIME_TYPES.includes(detectedMime)) {
    return {
      error: {
        name: originalName,
        error: {
          code: 'UNSUPPORTED_FILE_TYPE',
          message: '不支持的图片格式'
        }
      }
    }
  }

  if (!validateFileSignature(detectedMime, bytes)) {
    return {
      error: {
        name: originalName,
        error: {
          code: 'INVALID_FILE_SIGNATURE',
          message: '文件签名校验失败'
        }
      }
    }
  }

  const compressed = await compressToWebp(bytes, detectedMime, getWebpQuality(event))

  const uploadedAt = new Date().toISOString()
  const layout = getStorageLayout(event)
  const key = generateImageKey(compressed.mime, new Date(uploadedAt), layout)

  let backendId: string
  try {
    backendId = await putImage(key, compressed.bytes, {
      originalName,
      uploadedAt,
      contentType: compressed.mime,
      size: compressed.bytes.byteLength,
      userId: input.userId ?? null
    })
  } catch (error) {
    logException('upload failed: storage error', error, {
      name: originalName,
      source: input.source ?? 'web'
    })
    return {
      error: {
        name: originalName,
        error: {
          code: 'UPLOAD_FAILED',
          message: '上传失败，请稍后重试'
        }
      }
    }
  }

  logActivity(event, {
    action: 'upload',
    key,
    originalName,
    size: compressed.bytes.byteLength,
    contentType: compressed.mime,
    source: input.source,
    userId: input.userId ?? null,
    backendId
  })

  logInfo('upload success', {
    key,
    size: compressed.bytes.byteLength,
    contentType: compressed.mime,
    source: input.source ?? 'web'
  })

  if (input.tagIds?.length && input.userId != null) {
    attachTagsAfterUpload(key, input.tagIds, input.userId)
  }

  const item = buildImageItem({
    key,
    event,
    originalName,
    contentType: compressed.mime,
    size: compressed.bytes.byteLength,
    uploadedAt
  })

  const tags = getTagsForImageKeys([key]).get(key) ?? []

  return {
    item: {
      ...item,
      uploadSource: input.source === 'api' ? 'api' : 'web',
      ...(tags.length ? { tags } : {})
    }
  }
}

/** 与 multipart 声明的 MIME 交叉校验（可选） */
export function mimeMatchesDeclared(
  declaredMime: string,
  detectedMime: string
): boolean {
  if (!declaredMime || !isAllowedMimeType(declaredMime)) {
    return true
  }
  return declaredMime === detectedMime
}
