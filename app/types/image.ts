export type ErrorCode
  = | 'UNAUTHORIZED'
    | 'FORBIDDEN'
    | 'CONFLICT'
    | 'INVALID_REQUEST'
    | 'TOO_MANY_FILES'
    | 'FILE_TOO_LARGE'
    | 'UNSUPPORTED_FILE_TYPE'
    | 'INVALID_FILE_SIGNATURE'
    | 'INVALID_IMAGE_KEY'
    | 'IMAGE_NOT_FOUND'
    | 'UPLOAD_FAILED'
    | 'DELETE_FAILED'

export interface ApiError {
  code: ErrorCode
  message: string
}

export interface ApiErrorResponse {
  success: false
  error: ApiError
}

export interface ImageItem {
  key: string
  url: string
  originalName: string
  contentType: string
  size: number
  uploadedAt: string
  markdown: string
  html: string
  /** 管理员列表可见：上传者信息 */
  owner?: {
    userId: number | null
    username: string
  }
  /** 图片所在存储后端（统计/管理列表） */
  storage?: {
    id: string
    name: string
    type: 'local' | 's3'
  }
  /** 上传来源：网页或 API（来自活动日志） */
  uploadSource?: 'web' | 'api'
  /** 图片标签 */
  tags?: ImageTag[]
}

export interface ImageTag {
  id: number
  name: string
  color: string
  imageCount?: number
  createdAt?: string
  lastUsedAt?: string | null
}

export interface UploadErrorItem {
  name: string
  error: ApiError
}

export interface UploadResponse {
  success: boolean
  items: ImageItem[]
  errors: UploadErrorItem[]
}

export interface ImageListResponse {
  items: ImageItem[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export interface DeleteResponse {
  success: boolean
}

export interface BatchDeleteResponse {
  success: boolean
  deleted: string[]
  failed: Array<{ key: string, error: ApiError }>
}

export interface UploadProgressItem {
  name: string
  status: 'pending' | 'uploading' | 'success' | 'error'
  progress: number
  error?: string
}
