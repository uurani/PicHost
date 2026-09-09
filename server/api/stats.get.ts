import { getImageUserFilter, requireUserAuth } from '../utils/access'
import { createApiError } from '../utils/api-error'
import { logException } from '../utils/logger'
import { countUsers, getActivityStats } from '../utils/db'
import { readTagFilterQuery } from '../utils/image-query'
import {
  countImages,
  getFolderStorageStats,
  getUserScopedStorageStats
} from '../utils/storage'
import { buildBackendCapacity } from '../utils/storage-capacity'
import { getActiveBackendRow } from '../utils/storage/resolver'

interface StorageUsageStat {
  usedBytes: number
  totalBytes: number | null
  percent: number | null
}

async function resolveStorageUsage(usedBytes: number): Promise<StorageUsageStat> {
  const backend = getActiveBackendRow()
  if (!backend) {
    return { usedBytes, totalBytes: null, percent: null }
  }

  const capacity = await buildBackendCapacity(
    backend.id,
    backend.type,
    usedBytes,
    backend.quota_bytes
  )

  return {
    usedBytes,
    totalBytes: capacity.totalBytes,
    percent: capacity.percent
  }
}

export default defineEventHandler(async (event) => {
  const user = await requireUserAuth(event)
  const userFilter = await getImageUserFilter(event)
  const query = getQuery(event)
  const tagFilter = readTagFilterQuery(query)
  if (tagFilter === null) {
    createApiError(event, 'INVALID_REQUEST', '无效的标签筛选参数', 400)
  }

  try {
    if (userFilter === 'admin') {
      const activity = getActivityStats()
      const [storedCount, byFolder, storageUsage] = await Promise.all([
        countImages('admin', undefined, tagFilter),
        getFolderStorageStats('admin', tagFilter),
        resolveStorageUsage(activity.uploadBytesTotal)
      ])

      return {
        ...activity,
        storedCount,
        byFolder,
        userCount: countUsers(),
        storageUsage
      }
    }

    const scoped = await getUserScopedStorageStats(user.id, tagFilter)
    const storageUsage = await resolveStorageUsage(scoped.uploadBytesTotal)

    return {
      uploadToday: scoped.uploadToday,
      uploadYesterday: scoped.uploadYesterday,
      uploadMonth: scoped.uploadMonth,
      uploadLastMonth: scoped.uploadLastMonth,
      deleteToday: 0,
      deleteMonth: 0,
      uploadTotal: scoped.storedCount,
      deleteTotal: 0,
      uploadBytesTotal: scoped.uploadBytesTotal,
      bySource: { web: scoped.storedCount, api: 0 },
      byFolderUploads: scoped.byFolder.map(item => ({
        folder: item.folder,
        count: item.count
      })),
      storedCount: scoped.storedCount,
      byFolder: scoped.byFolder,
      storageUsage
    }
  } catch (error) {
    logException('stats failed', error)
    createApiError(event, 'INVALID_REQUEST', '读取统计失败', 500)
  }
})
