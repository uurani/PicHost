import type {
  ImageItem,
  ImageListResponse
} from '~/types/image'

const PAGE_SIZE_DEFAULT = 10

export function useImageList() {
  const { t } = useI18n()
  const items = ref<ImageItem[]>([])
  const page = ref(1)
  const pageSize = ref(PAGE_SIZE_DEFAULT)
  const totalPages = ref(1)
  const total = ref(0)
  const loading = ref(false)
  const totalCount = ref<number | null>(null)
  const loadingTotal = ref(false)
  const searchQuery = ref('')
  const activeSearch = ref('')
  const activeStorageBackend = ref('all')
  const activeContentType = ref('all')
  const activeUploadSource = ref('all')
  const activeTagIds = ref<number[]>([])
  const activeTagMode = ref<'or' | 'and'>('or')
  const activeUntaggedOnly = ref(false)
  const storageBackendOptions = ref<Array<{ id: string, name: string }>>([])

  function storageQueryParams(): Record<string, string> {
    const backendId = activeStorageBackend.value.trim()
    if (!backendId || backendId === 'all') return {}
    return { backendId }
  }

  function filterQueryParams(): Record<string, string> {
    const params: Record<string, string> = { ...storageQueryParams() }
    const contentType = activeContentType.value.trim()
    if (contentType && contentType !== 'all') {
      params.contentType = contentType
    }
    const uploadSource = activeUploadSource.value.trim()
    if (uploadSource && uploadSource !== 'all') {
      params.uploadSource = uploadSource
    }
    if (activeUntaggedOnly.value) {
      params.untagged = '1'
    } else if (activeTagIds.value.length) {
      params.tagIds = activeTagIds.value.join(',')
      if (activeTagMode.value === 'and' && activeTagIds.value.length > 1) {
        params.tagMode = 'and'
      }
    }
    return params
  }

  function listQueryParams(): Record<string, string> {
    return filterQueryParams()
  }

  function matchesActiveStorage(item: ImageItem) {
    const backendId = activeStorageBackend.value.trim()
    if (!backendId || backendId === 'all') return true
    return item.storage?.id === backendId
  }

  async function loadStorageBackendOptions() {
    try {
      const data = await $fetch<{
        backends: Array<{ id: string, name: string, type: string }>
      }>('/api/storage-backends', {
        credentials: 'include'
      })
      storageBackendOptions.value = data.backends.map(backend => ({
        id: backend.id,
        name: backend.name
      }))
    } catch {
      storageBackendOptions.value = []
    }
  }

  async function fetchTotal() {
    loadingTotal.value = true
    try {
      const data = await $fetch<{ total: number }>('/api/images/count', {
        credentials: 'include',
        query: listQueryParams()
      })
      totalCount.value = data.total
    } catch {
      totalCount.value = null
    } finally {
      loadingTotal.value = false
    }
  }

  async function fetchList(targetPage = 1) {
    loading.value = true
    try {
      const response = await $fetch<ImageListResponse>('/api/images', {
        credentials: 'include',
        query: {
          limit: pageSize.value,
          page: targetPage,
          ...listQueryParams()
        }
      })

      items.value = response.items
      page.value = response.page
      totalPages.value = response.totalPages
      total.value = response.total
    } finally {
      loading.value = false
    }
  }

  async function fetchSearch(targetPage = 1) {
    const q = activeSearch.value.trim()
    if (!q) {
      await fetchList(1)
      return
    }

    loading.value = true
    try {
      const response = await $fetch<ImageListResponse>('/api/images/search', {
        credentials: 'include',
        query: {
          q,
          limit: pageSize.value,
          page: targetPage,
          ...listQueryParams()
        }
      })

      items.value = response.items
      page.value = response.page
      totalPages.value = response.totalPages
      total.value = response.total
    } finally {
      loading.value = false
    }
  }

  async function refreshList() {
    activeSearch.value = ''
    searchQuery.value = ''
    page.value = 1
    await Promise.all([fetchList(1), fetchTotal()])
  }

  async function initializeList() {
    page.value = 1
    activeSearch.value = ''
    searchQuery.value = ''
    await Promise.all([fetchList(1), fetchTotal(), loadStorageBackendOptions()])
  }

  async function setActiveStorageBackend(backendId: string) {
    const next = backendId.trim() || 'all'
    if (next === activeStorageBackend.value) return
    activeStorageBackend.value = next
    page.value = 1
    if (activeSearch.value) {
      await Promise.all([fetchSearch(1), fetchTotal()])
    } else {
      await Promise.all([fetchList(1), fetchTotal()])
    }
  }

  async function setActiveContentType(contentType: string) {
    const next = contentType.trim() || 'all'
    if (next === activeContentType.value) return
    activeContentType.value = next
    page.value = 1
    if (activeSearch.value) {
      await Promise.all([fetchSearch(1), fetchTotal()])
    } else {
      await Promise.all([fetchList(1), fetchTotal()])
    }
  }

  async function setActiveUploadSource(uploadSource: string) {
    const next = uploadSource.trim() || 'all'
    if (next === activeUploadSource.value) return
    activeUploadSource.value = next
    page.value = 1
    if (activeSearch.value) {
      await Promise.all([fetchSearch(1), fetchTotal()])
    } else {
      await Promise.all([fetchList(1), fetchTotal()])
    }
  }

  async function setActiveTagFilter(options: {
    tagIds?: number[]
    tagMode?: 'or' | 'and'
    untaggedOnly?: boolean
  }) {
    if (options.tagIds !== undefined) {
      activeTagIds.value = [...options.tagIds]
    }
    if (options.tagMode !== undefined) {
      activeTagMode.value = options.tagMode
    }
    if (options.untaggedOnly !== undefined) {
      activeUntaggedOnly.value = options.untaggedOnly
    }
    page.value = 1
    if (activeSearch.value) {
      await Promise.all([fetchSearch(1), fetchTotal()])
    } else {
      await Promise.all([fetchList(1), fetchTotal()])
    }
  }

  async function toggleTagFilter(tagId: number) {
    const next = new Set(activeTagIds.value)
    activeUntaggedOnly.value = false
    if (next.has(tagId)) {
      next.delete(tagId)
    } else {
      next.add(tagId)
    }
    await setActiveTagFilter({ tagIds: [...next] })
  }

  async function resetFilters() {
    searchQuery.value = ''
    activeSearch.value = ''
    activeStorageBackend.value = 'all'
    activeContentType.value = 'all'
    activeUploadSource.value = 'all'
    activeTagIds.value = []
    activeTagMode.value = 'or'
    activeUntaggedOnly.value = false
    page.value = 1
    await Promise.all([fetchList(1), fetchTotal()])
  }

  async function submitSearch() {
    const q = searchQuery.value.trim()
    activeSearch.value = q
    page.value = 1
    if (!q) {
      await refreshList()
      return
    }
    await fetchSearch(1)
  }

  async function goToPage(targetPage: number) {
    if (targetPage < 1 || targetPage > totalPages.value || loading.value) return
    if (activeSearch.value) {
      await fetchSearch(targetPage)
    } else {
      await fetchList(targetPage)
    }
  }

  async function setPageSize(size: number) {
    if (!Number.isFinite(size) || size <= 0 || size === pageSize.value) return
    pageSize.value = size
    page.value = 1
    if (activeSearch.value) {
      await Promise.all([fetchSearch(1), fetchTotal()])
    } else {
      await Promise.all([fetchList(1), fetchTotal()])
    }
  }

  function prependItems(newItems: ImageItem[]) {
    const matched = newItems.filter(item => matchesActiveStorage(item))
    if (!matched.length || page.value !== 1) return
    items.value = [...matched, ...items.value]
    total.value += matched.length
    if (totalCount.value !== null) {
      totalCount.value += matched.length
    }
  }

  function removeItems(keys: string[]) {
    const keySet = new Set(keys)
    const removed = items.value.filter(item => keySet.has(item.key)).length
    items.value = items.value.filter(item => !keySet.has(item.key))
    if (removed > 0) {
      total.value = Math.max(0, total.value - removed)
    }
    if (totalCount.value !== null && removed > 0) {
      totalCount.value = Math.max(0, totalCount.value - removed)
    }
  }

  const activeStorageLabel = computed(() => {
    if (activeStorageBackend.value === 'all') return ''
    return storageBackendOptions.value.find(
      backend => backend.id === activeStorageBackend.value
    )?.name ?? activeStorageBackend.value
  })

  const listSummary = computed(() => {
    const storageLabel = activeStorageLabel.value
    if (loadingTotal.value && totalCount.value === null) {
      return storageLabel
        ? `${storageLabel} · ${t('stats.counting')}`
        : t('stats.counting')
    }
    if (activeSearch.value) {
      if (storageLabel) {
        return t('stats.summarySearchStorage', {
          q: activeSearch.value,
          total: total.value,
          storage: storageLabel
        })
      }
      return t('stats.summarySearch', { q: activeSearch.value, total: total.value })
    }
    const count = totalCount.value === null ? total.value : totalCount.value
    if (storageLabel) {
      return t('stats.summaryTotalStorage', {
        total: count,
        storage: storageLabel
      })
    }
    return t('stats.summaryTotal', { total: count })
  })

  function updateItemTags(key: string, tags: ImageItem['tags']) {
    items.value = items.value.map(item =>
      item.key === key ? { ...item, tags } : item
    )
  }

  return {
    items,
    page,
    pageSize,
    totalPages,
    total,
    loading,
    activeStorageBackend,
    activeContentType,
    activeUploadSource,
    activeTagIds,
    activeTagMode,
    activeUntaggedOnly,
    storageBackendOptions,
    searchQuery,
    activeSearch,
    listSummary,
    fetchList,
    fetchSearch,
    fetchTotal,
    refreshList,
    initializeList,
    setActiveStorageBackend,
    setActiveContentType,
    setActiveUploadSource,
    setActiveTagFilter,
    toggleTagFilter,
    resetFilters,
    loadStorageBackendOptions,
    submitSearch,
    goToPage,
    setPageSize,
    prependItems,
    removeItems,
    updateItemTags,
    listQueryParams
  }
}
