import { requireUserAuth } from '../../utils/access'
import { logActivity } from '../../utils/activity-log'
import { createApiError } from '../../utils/api-error'
import { getUserAutoDeletePolicy, setUserAutoDeletePolicy } from '../../utils/db'
import { MAX_AUTO_DELETE_DAYS, parseAutoDeleteDays } from '../../utils/env'

interface UserSettingsPatchBody {
  autoDeleteDays?: unknown
}

export default defineEventHandler(async (event) => {
  const user = await requireUserAuth(event)

  const body = await readBody<UserSettingsPatchBody>(event).catch(
    (): UserSettingsPatchBody => ({})
  )

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
    setUserAutoDeletePolicy(user.id, days)
  }

  const policy = getUserAutoDeletePolicy(user.id)

  if (body.autoDeleteDays !== undefined) {
    logActivity(event, {
      action: 'settings',
      key: 'user/settings',
      originalName: '上传偏好',
      userId: user.id
    })
  }

  return {
    autoDeleteDays: policy.days
  }
})
