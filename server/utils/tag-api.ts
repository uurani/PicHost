import type { H3Event } from 'h3'
import { createApiError } from './api-error'

export function handleTagApiError(event: H3Event, error: unknown): never {
  if (error instanceof Error) {
    if (error.message === 'INVALID_TAG_NAME') {
      createApiError(event, 'INVALID_REQUEST', '标签名称无效（1–32 字）', 400)
    }
    if (error.message === 'INVALID_TAG_COLOR') {
      createApiError(event, 'INVALID_REQUEST', '标签颜色格式无效', 400)
    }
    if (error.message === 'TAG_EXISTS') {
      createApiError(event, 'CONFLICT', '标签已存在', 409)
    }
    if (error.message === 'TAG_LIMIT_REACHED') {
      createApiError(event, 'INVALID_REQUEST', '标签数量已达上限', 400)
    }
    if (error.message === 'TAG_NOT_FOUND') {
      createApiError(event, 'INVALID_REQUEST', '标签不存在', 404)
    }
    if (error.message === 'IMAGE_NOT_FOUND') {
      createApiError(event, 'IMAGE_NOT_FOUND', '图片不存在', 404)
    }
    if (error.message === 'FORBIDDEN') {
      createApiError(event, 'FORBIDDEN', '无权操作', 403)
    }
  }
  throw error
}
