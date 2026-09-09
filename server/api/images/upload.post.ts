import { readMultipartFormData } from 'h3'
import type { UploadResponse, UploadErrorItem, ImageItem } from '~/types/image'
import { requireUploadAuth, verifyApiUploadToken, getUploadUserId } from '../../utils/access'
import { MAX_FILES_PER_UPLOAD } from '../../utils/constants'
import {
  detectMimeFromSignature,
  isAllowedMimeType
} from '../../utils/file-signature'
import {
  mimeMatchesDeclared,
  processSingleImageUpload
} from '../../utils/process-image-upload'
import { createApiError } from '../../utils/api-error'
import { checkUploadRateLimit } from '../../utils/rate-limit'
import { parseTagIdsParam } from '../../utils/tags'

export default defineEventHandler(async (event) => {
  await requireUploadAuth(event)

  const formData = await readMultipartFormData(event)
  if (!formData?.length) {
    createApiError(event, 'INVALID_REQUEST', '未收到上传文件', 400)
  }

  const tokenField = formData.find(part => part.name === 'token')
  const formToken = tokenField?.data?.length
    ? new TextDecoder().decode(tokenField.data).trim()
    : ''
  checkUploadRateLimit(event, formToken)

  const source = verifyApiUploadToken(event) ? 'api' : 'web'
  const uploadUserId = await getUploadUserId(event)

  const tagIdsField = formData.find(part => part.name === 'tagIds')
  let uploadTagIds: number[] = []
  if (tagIdsField?.data?.length) {
    const raw = new TextDecoder().decode(tagIdsField.data).trim()
    try {
      const parsed = JSON.parse(raw) as unknown
      uploadTagIds = parseTagIdsParam(parsed)
    } catch {
      uploadTagIds = parseTagIdsParam(raw)
    }
  } else {
    const repeatFields = formData.filter(part => part.name === 'tagIds' && part.data?.length)
    if (repeatFields.length) {
      uploadTagIds = parseTagIdsParam(
        repeatFields.map(part => new TextDecoder().decode(part.data!).trim())
      )
    }
  }

  // 兼容 image / file / files 字段名（图床脚本 / 通用客户端 / 网页多图）
  const fileParts = formData.filter(
    part => (part.name === 'image' || part.name === 'file' || part.name === 'files')
      && part.data?.length
  )
  if (!fileParts.length) {
    createApiError(event, 'INVALID_REQUEST', '未收到上传文件', 400)
  }

  if (fileParts.length > MAX_FILES_PER_UPLOAD) {
    createApiError(
      event,
      'TOO_MANY_FILES',
      `每次最多上传 ${MAX_FILES_PER_UPLOAD} 张图片`,
      400
    )
  }

  const items: ImageItem[] = []
  const errors: UploadErrorItem[] = []

  for (const part of fileParts) {
    const originalName = part.filename ?? 'image'
    const bytes = new Uint8Array(part.data)
    const declaredMime = part.type?.toLowerCase() ?? ''
    const detectedMime = detectMimeFromSignature(bytes)

    if (detectedMime && !mimeMatchesDeclared(declaredMime, detectedMime)) {
      errors.push({
        name: originalName,
        error: {
          code: 'INVALID_FILE_SIGNATURE',
          message: '文件类型与内容不匹配'
        }
      })
      continue
    }

    if (declaredMime && isAllowedMimeType(declaredMime) && !detectedMime) {
      errors.push({
        name: originalName,
        error: {
          code: 'INVALID_FILE_SIGNATURE',
          message: '无法识别的图片格式'
        }
      })
      continue
    }

    const result = await processSingleImageUpload(event, {
      bytes,
      filename: part.filename,
      source,
      userId: uploadUserId,
      tagIds: uploadTagIds
    })

    if ('error' in result) {
      errors.push(result.error)
    } else {
      items.push(result.item)
    }
  }

  const response: UploadResponse = {
    success: items.length > 0,
    items,
    errors
  }

  if (!items.length && errors.length) {
    setResponseStatus(event, 400)
  }

  return response
})
