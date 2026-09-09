const STORAGE_KEY = 'pichost.recent-tag-ids'
const MAX_RECENT = 12

function readRecentIds(): number[] {
  if (import.meta.server) return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter((id: unknown): id is number => Number.isInteger(id) && (id as number) > 0)
  } catch {
    return []
  }
}

function writeRecentIds(ids: number[]) {
  if (import.meta.server) return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(ids))
}

export function useRecentTags() {
  const recentIds = useState<number[]>('recent-tag-ids', () => [])

  function loadRecentIds() {
    recentIds.value = readRecentIds()
  }

  if (import.meta.client && !recentIds.value.length) {
    loadRecentIds()
  }

  function recordRecent(tagIds: number[]) {
    if (!tagIds.length) return
    const merged = [
      ...tagIds,
      ...recentIds.value.filter(id => !tagIds.includes(id))
    ].slice(0, MAX_RECENT)
    recentIds.value = merged
    writeRecentIds(merged)
  }

  return {
    recentIds,
    loadRecentIds,
    recordRecent
  }
}
