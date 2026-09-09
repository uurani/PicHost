export type LogAction = 'upload' | 'delete' | 'login' | 'edit' | 'settings' | 'tags'
export type LogSource = 'web' | 'api' | 'admin'
export type LogStatus = 'success' | 'failure'

export interface ActivityLogStorage {
  id: string
  name: string
  type: string
}

export interface ActivityLogItem {
  id: number
  action: LogAction
  key: string
  originalName: string
  size: number
  contentType: string
  source: LogSource
  userId: number | null
  username: string | null
  storage: ActivityLogStorage | null
  ipAddress: string | null
  status: LogStatus
  createdAt: string
}

export interface ActivityLogListResponse {
  items: ActivityLogItem[]
  total: number
  page: number
  pageSize: number
  totalPages: number
  summary: {
    total: number
    upload: number
    delete: number
  }
  users?: Array<{ id: number, username: string }>
}
