import { requireAdminAuth } from '../../utils/access'
import { logActivity } from '../../utils/activity-log'
import { createApiError } from '../../utils/api-error'
import {
  getSetting,
  setSetting,
  SETTINGS_ALLOWED_REFERER_HOSTS,
  SETTINGS_HIDE_FOLDER_IN_URL,
  SETTINGS_STORAGE_USE_DATE_PATH,
  SETTINGS_IMAGE_BASE_URL,
  SETTINGS_SITE_BASE_URL,
  SETTINGS_WEBP_QUALITY,
  SETTINGS_LOGIN_VERIFICATION_METHOD,
  SETTINGS_TURNSTILE_SITE_KEY,
  SETTINGS_TURNSTILE_SECRET_KEY,
  SETTINGS_CAP_API_ENDPOINT,
  SETTINGS_CAP_SECRET,
  setAllowRegistration
} from '../../utils/db'
import {
  getSettingsPayload,
  isValidImageBaseUrl,
  isValidRefererHost,
  isValidSiteBaseUrl,
  normalizeCapApiEndpoint,
  parseLoginVerificationMethod,
  MAX_AUTO_DELETE_DAYS,
  normalizeImageBaseUrl,
  normalizeRefererHosts,
  normalizeSiteBaseUrl,
  parseAutoDeleteDays,
  parseWebpQuality,
  setGlobalAutoDeletePolicy,
  validateLoginVerificationSettings,
  validateSettingsDomainPatch
} from '../../utils/env'

interface SettingsPatchBody {
  webpQuality?: unknown
  allowedRefererHosts?: unknown
  siteBaseUrl?: unknown
  imageBaseUrl?: unknown
  domainSeparation?: unknown
  hideFolderInUrl?: unknown
  storageUseDatePath?: unknown
  autoDeleteDays?: unknown
  allowRegistration?: unknown
  loginVerificationMethod?: unknown
  turnstileSiteKey?: unknown
  turnstileSecretKey?: unknown
  capApiEndpoint?: unknown
  capSecret?: unknown
}

export default defineEventHandler(async (event) => {
  const user = await requireAdminAuth(event)

  const body = await readBody<SettingsPatchBody>(event).catch(
    (): SettingsPatchBody => ({})
  )

  if (body.webpQuality !== undefined) {
    const quality = parseWebpQuality(String(body.webpQuality))
    if (quality === null) {
      createApiError(event, 'INVALID_REQUEST', '压缩质量需为 1–100 的整数', 400)
    }
    setSetting(SETTINGS_WEBP_QUALITY, String(quality))
  }

  if (body.allowedRefererHosts !== undefined) {
    const raw = typeof body.allowedRefererHosts === 'string'
      ? body.allowedRefererHosts
      : ''
    const normalized = normalizeRefererHosts(raw)
    if (normalized) {
      const invalid = normalized.split(',').find(host => !isValidRefererHost(host))
      if (invalid) {
        createApiError(
          event,
          'INVALID_REQUEST',
          `无效的 Referer 域名：${invalid}`,
          400
        )
      }
    }
    setSetting(SETTINGS_ALLOWED_REFERER_HOSTS, normalized)
  }

  const existingSite = normalizeSiteBaseUrl(getSetting(SETTINGS_SITE_BASE_URL) ?? '')
  const existingImage = normalizeImageBaseUrl(getSetting(SETTINGS_IMAGE_BASE_URL) ?? '')
  let nextSite = existingSite
  let nextImage = existingImage

  if (body.siteBaseUrl !== undefined) {
    const configured = normalizeSiteBaseUrl(
      typeof body.siteBaseUrl === 'string' ? body.siteBaseUrl : ''
    )
    if (configured && !isValidSiteBaseUrl(configured)) {
      createApiError(
        event,
        'INVALID_REQUEST',
        'SITE_BASE_URL 需为 http(s) 地址，且末尾不加 /',
        400
      )
    }
    nextSite = configured
  }

  if (body.imageBaseUrl !== undefined) {
    const configured = normalizeImageBaseUrl(
      typeof body.imageBaseUrl === 'string' ? body.imageBaseUrl : ''
    )
    if (configured && !isValidImageBaseUrl(configured)) {
      createApiError(
        event,
        'INVALID_REQUEST',
        'IMAGE_BASE_URL 需为 http(s) 地址，或留空使用当前请求域名',
        400
      )
    }
    nextImage = configured
  }

  const domainSeparationProvided = body.domainSeparation !== undefined
  const wantSeparation = domainSeparationProvided
    ? Boolean(body.domainSeparation)
    : null

  const patchError = validateSettingsDomainPatch({
    existingSite,
    existingImage,
    nextSite,
    nextImage,
    wantSeparation,
    siteBaseUrlProvided: body.siteBaseUrl !== undefined
  })
  if (patchError) {
    createApiError(event, 'INVALID_REQUEST', patchError, 400)
  }

  if (wantSeparation === false) {
    nextSite = ''
  }

  if (body.siteBaseUrl !== undefined || body.domainSeparation !== undefined) {
    setSetting(SETTINGS_SITE_BASE_URL, nextSite)
  }

  if (body.imageBaseUrl !== undefined) {
    setSetting(SETTINGS_IMAGE_BASE_URL, nextImage)
  }

  if (body.autoDeleteDays !== undefined) {
    const days = parseAutoDeleteDays(String(body.autoDeleteDays))
    if (days === null) {
      createApiError(
        event,
        'INVALID_REQUEST',
        `自动删除天数需为 0–${MAX_AUTO_DELETE_DAYS} 的整数（0 表示关闭）`,
        400
      )
    }
    setGlobalAutoDeletePolicy(days)
  }

  if (body.allowRegistration !== undefined) {
    setAllowRegistration(Boolean(body.allowRegistration))
  }

  if (body.hideFolderInUrl !== undefined) {
    setSetting(SETTINGS_HIDE_FOLDER_IN_URL, body.hideFolderInUrl ? 'true' : 'false')
  }

  if (body.storageUseDatePath !== undefined) {
    setSetting(SETTINGS_STORAGE_USE_DATE_PATH, body.storageUseDatePath ? 'true' : 'false')
  }

  const currentMethod = parseLoginVerificationMethod(
    getSetting(SETTINGS_LOGIN_VERIFICATION_METHOD) ?? 'slider'
  ) ?? 'slider'
  let nextMethod = currentMethod
  let nextTurnstileSiteKey = getSetting(SETTINGS_TURNSTILE_SITE_KEY) ?? ''
  let nextTurnstileSecretKey = getSetting(SETTINGS_TURNSTILE_SECRET_KEY) ?? ''
  let nextCapApiEndpoint = getSetting(SETTINGS_CAP_API_ENDPOINT) ?? ''
  let nextCapSecret = getSetting(SETTINGS_CAP_SECRET) ?? ''

  if (body.loginVerificationMethod !== undefined) {
    const parsed = parseLoginVerificationMethod(String(body.loginVerificationMethod))
    if (!parsed) {
      createApiError(event, 'INVALID_REQUEST', '无效的登录验证方式', 400)
    }
    nextMethod = parsed
  }

  if (body.turnstileSiteKey !== undefined) {
    nextTurnstileSiteKey = typeof body.turnstileSiteKey === 'string'
      ? body.turnstileSiteKey.trim()
      : ''
  }

  if (body.turnstileSecretKey !== undefined) {
    nextTurnstileSecretKey = typeof body.turnstileSecretKey === 'string'
      ? body.turnstileSecretKey.trim()
      : ''
  }

  if (body.capApiEndpoint !== undefined) {
    nextCapApiEndpoint = typeof body.capApiEndpoint === 'string'
      ? normalizeCapApiEndpoint(body.capApiEndpoint)
      : ''
  }

  if (body.capSecret !== undefined) {
    nextCapSecret = typeof body.capSecret === 'string'
      ? body.capSecret.trim()
      : ''
  }

  if (body.loginVerificationMethod !== undefined
    || body.turnstileSiteKey !== undefined
    || body.turnstileSecretKey !== undefined
    || body.capApiEndpoint !== undefined
    || body.capSecret !== undefined) {
    const settingsError = validateLoginVerificationSettings(
      nextMethod,
      nextTurnstileSiteKey,
      nextTurnstileSecretKey,
      nextCapApiEndpoint,
      nextCapSecret
    )
    if (settingsError) {
      createApiError(event, 'INVALID_REQUEST', settingsError, 400)
    }
  }

  if (body.loginVerificationMethod !== undefined) {
    setSetting(SETTINGS_LOGIN_VERIFICATION_METHOD, nextMethod)
  }
  if (body.turnstileSiteKey !== undefined) {
    setSetting(SETTINGS_TURNSTILE_SITE_KEY, nextTurnstileSiteKey)
  }
  if (body.turnstileSecretKey !== undefined) {
    setSetting(SETTINGS_TURNSTILE_SECRET_KEY, nextTurnstileSecretKey)
  }
  if (body.capApiEndpoint !== undefined) {
    setSetting(SETTINGS_CAP_API_ENDPOINT, nextCapApiEndpoint)
  }
  if (body.capSecret !== undefined) {
    setSetting(SETTINGS_CAP_SECRET, nextCapSecret)
  }

  logActivity(event, {
    action: 'settings',
    key: 'settings/system',
    originalName: '系统设置',
    userId: user.id,
    source: 'admin'
  })

  return getSettingsPayload(event)
})
