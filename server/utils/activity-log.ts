import type { H3Event } from 'h3'
import { getHeader } from 'h3'
import {
  insertActivityLog,
  type LogAction,
  type LogSource,
  type LogStatus
} from './db'
import { verifyApiUploadToken } from './access'
import { clientIp } from './logger'

export const LOG_ACTIONS: LogAction[] = [
  'upload',
  'delete',
  'login',
  'edit',
  'settings',
  'tags'
]

export const LOG_SOURCES: LogSource[] = ['web', 'api', 'admin']

export function isLogAction(value: string): value is LogAction {
  return LOG_ACTIONS.includes(value as LogAction)
}

export function isLogSource(value: string): value is LogSource {
  return LOG_SOURCES.includes(value as LogSource)
}

export function resolveActivityLogSource(event: H3Event): LogSource {
  if (verifyApiUploadToken(event)) {
    return 'api'
  }
  const referer = getHeader(event, 'referer') ?? ''
  if (/\/settings(?:[/?#]|$)|\/storage(?:[/?#]|$)/.test(referer)) {
    return 'admin'
  }
  return 'web'
}

export interface ActivityLogEventInput {
  action: LogAction
  key: string
  originalName: string
  size?: number
  contentType?: string
  source?: LogSource
  userId?: number | null
  backendId?: string | null
  status?: LogStatus
}

export function logActivity(event: H3Event, input: ActivityLogEventInput): void {
  insertActivityLog({
    action: input.action,
    key: input.key,
    originalName: input.originalName,
    size: input.size ?? 0,
    contentType: input.contentType ?? '',
    source: input.source ?? resolveActivityLogSource(event),
    userId: input.userId ?? null,
    backendId: input.backendId ?? null,
    ipAddress: clientIp(event),
    status: input.status ?? 'success'
  })
}
