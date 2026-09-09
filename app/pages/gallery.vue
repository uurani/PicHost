<script setup lang="ts">
import type { ImageItem } from '~/types/image'

interface StatsResponse {
  uploadToday: number
  uploadYesterday: number
  uploadMonth: number
  uploadLastMonth: number
  deleteToday: number
  deleteMonth: number
  uploadTotal: number
  deleteTotal: number
  uploadBytesTotal: number
  storedCount: number
  userCount?: number
  bySource: {
    web: number
    api: number
  }
  storageUsage: {
    usedBytes: number
    totalBytes: number | null
    percent: number | null
  }
}

const {
  items,
  page: galleryPage,
  pageSize: galleryPageSize,
  totalPages: galleryTotalPages,
  total: galleryTotal,
  loading: galleryLoading,
  searchQuery,
  activeSearch,
  fetchList,
  fetchSearch,
  fetchTotal,
  submitSearch,
  goToPage,
  setPageSize,
  removeItems,
  activeStorageBackend,
  setActiveStorageBackend,
  storageBackendOptions,
  activeUploadSource,
  setActiveUploadSource,
  resetFilters,
  loadStorageBackendOptions,
  activeTagIds,
  activeTagMode,
  activeUntaggedOnly,
  setActiveTagFilter,
  toggleTagFilter,
  listQueryParams
} = useImageList()

const { items: tagItems, fetchTags, batchUpdateTags } = useTags()

const { isChecking, isAuthenticated, checkSession, handleAuthError, fetchStatus } = useAuth()
const toast = useToast()
const { t } = useI18n()

const stats = ref<StatsResponse | null>(null)
const statsLoading = ref(false)
const pageRefreshing = computed(() => statsLoading.value || galleryLoading.value)

const selectedKeys = ref<Set<string>>(new Set())
const deletingKeys = ref<Set<string>>(new Set())
const deleteModalOpen = ref(false)
const deleteTargetKeys = ref<string[]>([])
const batchDeleting = ref(false)
const showScrollTop = ref(false)
const previewOpen = ref(false)
const previewImage = ref<ImageItem | null>(null)
const viewMode = ref<'grid' | 'list'>('grid')
const batchTagOpen = ref(false)

const currentUploadSource = ref('all')
const currentStorageBackend = ref('all')

const uploadSourceItems = computed(() => [
  { label: t('stats.filterSourceAll'), value: 'all' },
  { label: t('stats.sourceWeb'), value: 'web' },
  { label: t('stats.sourceApi'), value: 'api' }
])

const storageBackendItems = computed(() => [
  { label: t('stats.filterStorageAll'), value: 'all' },
  ...storageBackendOptions.value.map(backend => ({
    label: backend.name,
    value: backend.id
  }))
])

const selectedCount = computed(() => selectedKeys.value.size)

function onWindowScroll() {
  showScrollTop.value = window.scrollY > 400
}

function scrollToTop() {
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

async function fetchStats() {
  stats.value = await $fetch<StatsResponse>('/api/stats', {
    credentials: 'include',
    query: listQueryParams()
  })
}

async function refreshStats() {
  statsLoading.value = true
  try {
    await fetchStats()
  } catch (error: unknown) {
    handleAuthError(error)
    if (isAuthenticated.value) {
      toast.add({ title: t('stats.loadFailed'), color: 'error' })
    }
  } finally {
    statsLoading.value = false
  }
}

async function reloadGallery() {
  if (activeSearch.value) {
    await fetchSearch(galleryPage.value)
  } else {
    await fetchList(galleryPage.value)
  }
  await fetchTotal()
}

async function refreshAll() {
  if (!isAuthenticated.value) return
  selectedKeys.value = new Set()
  statsLoading.value = true
  try {
    await Promise.all([
      fetchStats(),
      reloadGallery(),
      loadStorageBackendOptions(),
      fetchTags()
    ])
    currentUploadSource.value = activeUploadSource.value
    currentStorageBackend.value = activeStorageBackend.value
  } catch (error: unknown) {
    handleAuthError(error)
    if (isAuthenticated.value) {
      toast.add({ title: t('stats.loadFailed'), color: 'error' })
    }
  } finally {
    statsLoading.value = false
  }
}

async function handleStorageBackendChange(backendId: string) {
  if (!isAuthenticated.value) return
  currentStorageBackend.value = backendId
  selectedKeys.value = new Set()
  try {
    await setActiveStorageBackend(backendId)
  } catch (error: unknown) {
    handleAuthError(error)
  }
}

async function handleUploadSourceChange(uploadSource: string) {
  if (!isAuthenticated.value) return
  currentUploadSource.value = uploadSource
  selectedKeys.value = new Set()
  try {
    await setActiveUploadSource(uploadSource)
  } catch (error: unknown) {
    handleAuthError(error)
  }
}

async function handleResetFilters() {
  if (!isAuthenticated.value) return
  selectedKeys.value = new Set()
  currentUploadSource.value = 'all'
  currentStorageBackend.value = 'all'
  try {
    await resetFilters()
    await fetchStats()
  } catch (error: unknown) {
    handleAuthError(error)
  }
}

async function handleTagIdsChange(tagIds: number[]) {
  if (!isAuthenticated.value) return
  selectedKeys.value = new Set()
  try {
    await setActiveTagFilter({ tagIds, untaggedOnly: false })
    await fetchStats()
  } catch (error: unknown) {
    handleAuthError(error)
  }
}

async function handleTagModeChange(tagMode: 'or' | 'and') {
  if (!isAuthenticated.value) return
  try {
    await setActiveTagFilter({ tagMode })
    await fetchStats()
  } catch (error: unknown) {
    handleAuthError(error)
  }
}

async function handleUntaggedOnlyChange(untaggedOnly: boolean) {
  if (!isAuthenticated.value) return
  selectedKeys.value = new Set()
  try {
    await setActiveTagFilter({ untaggedOnly, tagIds: [] })
    await fetchStats()
  } catch (error: unknown) {
    handleAuthError(error)
  }
}

async function handleTagFilterClick(tagId: number) {
  if (!isAuthenticated.value) return
  selectedKeys.value = new Set()
  try {
    await toggleTagFilter(tagId)
    await fetchStats()
  } catch (error: unknown) {
    handleAuthError(error)
  }
}

async function handleUntaggedFilterClick() {
  if (!isAuthenticated.value) return
  selectedKeys.value = new Set()
  try {
    await setActiveTagFilter({ untaggedOnly: true, tagIds: [] })
    await fetchStats()
  } catch (error: unknown) {
    handleAuthError(error)
  }
}

async function confirmBatchTags(tagIds: number[], action: 'add' | 'remove') {
  const keys = Array.from(selectedKeys.value)
  if (!keys.length || !tagIds.length) return
  try {
    await batchUpdateTags(keys, tagIds, action)
    batchTagOpen.value = false
    selectedKeys.value = new Set()
    toast.add({ title: t('tags.batchSuccess'), color: 'success' })
    await Promise.all([reloadGallery(), fetchStats(), fetchTags(true)])
  } catch (error: unknown) {
    handleAuthError(error)
    toast.add({ title: t('tags.batchFailed'), color: 'error' })
  }
}

function goToTagSettings() {
  void navigateTo({ path: '/settings', query: { tab: 'tags' } })
}

function updateSelectedKeys(keys: Set<string>) {
  selectedKeys.value = keys
}

async function handleSearch() {
  if (!isAuthenticated.value) return
  selectedKeys.value = new Set()
  try {
    await submitSearch()
  } catch (error: unknown) {
    handleAuthError(error)
  }
}

function requestDelete(key: string) {
  if (!isAuthenticated.value) return
  previewOpen.value = false
  previewImage.value = null
  deleteTargetKeys.value = [key]
  deleteModalOpen.value = true
}

function requestBatchDelete() {
  if (!isAuthenticated.value) return
  if (!selectedCount.value) {
    toast.add({ title: t('stats.selectFirst'), color: 'warning' })
    return
  }
  deleteTargetKeys.value = Array.from(selectedKeys.value)
  deleteModalOpen.value = true
}

function clearSelection() {
  selectedKeys.value = new Set()
}

async function confirmDelete() {
  const keys = [...deleteTargetKeys.value]
  if (!keys.length || !isAuthenticated.value) return

  batchDeleting.value = true
  for (const key of keys) {
    deletingKeys.value.add(key)
  }

  const deleted: string[] = []
  const failed: string[] = []

  try {
    const response = await $fetch<{
      deleted: string[]
      failed: Array<{ key: string }>
    }>('/api/images/batch-delete', {
      method: 'POST',
      body: { keys }
    })
    deleted.push(...response.deleted)
    failed.push(...response.failed.map(item => item.key))

    if (deleted.length) {
      removeItems(deleted)
      for (const key of deleted) {
        selectedKeys.value.delete(key)
      }
      selectedKeys.value = new Set(selectedKeys.value)
      toast.add({
        title: t('stats.deleted', { n: deleted.length }),
        color: 'success'
      })
      await refreshStats()
      await reloadGallery()
      if (items.value.length === 0 && galleryPage.value > 1) {
        await goToPage(galleryPage.value - 1)
      }
    }

    if (failed.length) {
      toast.add({
        title: t('stats.deletePartialFail', { n: failed.length }),
        color: 'error'
      })
    }

    deleteModalOpen.value = false
    deleteTargetKeys.value = []
  } catch (error: unknown) {
    handleAuthError(error)
    if (isAuthenticated.value) {
      toast.add({ title: t('stats.deleteFailed'), color: 'error' })
    }
  } finally {
    batchDeleting.value = false
    deletingKeys.value = new Set()
  }
}

async function handleGalleryPageChange(targetPage: number) {
  selectedKeys.value = new Set()
  previewOpen.value = false
  previewImage.value = null
  try {
    await goToPage(targetPage)
  } catch (error: unknown) {
    handleAuthError(error)
  }
}

async function handleGalleryPageSizeChange(size: number) {
  selectedKeys.value = new Set()
  previewOpen.value = false
  previewImage.value = null
  try {
    await setPageSize(size)
  } catch (error: unknown) {
    handleAuthError(error)
  }
}

function openPreview(image: ImageItem) {
  previewImage.value = image
  previewOpen.value = true
}

function requestPreviewDelete() {
  if (!previewImage.value) return
  requestDelete(previewImage.value.key)
}

onMounted(async () => {
  window.addEventListener('scroll', onWindowScroll, { passive: true })
  const status = await fetchStatus()
  if (!status.initialized && !status.legacyMode) {
    await navigateTo('/setup')
    return
  }
  await checkSession()
  if (isAuthenticated.value) {
    await refreshAll()
  }
})

onUnmounted(() => {
  window.removeEventListener('scroll', onWindowScroll)
})

watch(isAuthenticated, async (authed, prev) => {
  if (authed && prev === false) {
    await nextTick()
    await refreshAll()
  } else if (!authed) {
    stats.value = null
    items.value = []
    selectedKeys.value = new Set()
  }
})
</script>

<template>
  <div class="min-h-screen">
    <div
      v-if="isChecking"
      class="flex min-h-screen items-center justify-center"
    >
      <div class="flex flex-col items-center gap-3 text-muted">
        <UIcon
          name="i-lucide-loader-circle"
          class="size-8 animate-spin"
        />
        <p class="text-sm">
          {{ t('common.loadingSession') }}
        </p>
      </div>
    </div>

    <AdminLoginGate v-else-if="!isAuthenticated" />

    <AppShell v-else>
      <div class="flex items-start justify-between gap-3">
        <div class="min-w-0">
          <h1 class="text-2xl font-semibold tracking-tight">
            {{ t('stats.title') }}
          </h1>
          <p class="text-sm text-muted">
            {{ t('stats.subtitle') }}
          </p>
        </div>

        <UButton
          icon="i-lucide-refresh-cw"
          variant="ghost"
          color="neutral"
          size="sm"
          class="mt-0.5 shrink-0"
          :aria-label="t('common.refresh')"
          :loading="pageRefreshing"
          @click="refreshAll"
        />
      </div>

      <GalleryStatsOverview
        :stats="stats"
        :loading="statsLoading"
      />

      <section class="space-y-3">
        <div class="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <GallerySelectionBar
            :items="items"
            :selected-keys="selectedKeys"
            @update:selected-keys="updateSelectedKeys"
            @clear="clearSelection"
          />

          <GalleryFilterBar
            v-model:search-query="searchQuery"
            :storage-backend="currentStorageBackend"
            :storage-backend-items="storageBackendItems"
            :upload-source="currentUploadSource"
            :upload-source-items="uploadSourceItems"
            :tag-ids="activeTagIds"
            :tag-mode="activeTagMode"
            :untagged-only="activeUntaggedOnly"
            :tags="tagItems"
            :view-mode="viewMode"
            :selected-count="selectedCount"
            :loading="galleryLoading"
            :show-batch-delete="true"
            :show-batch-tags="selectedCount > 0"
            @update:storage-backend="handleStorageBackendChange"
            @update:upload-source="handleUploadSourceChange"
            @update:tag-ids="handleTagIdsChange"
            @update:tag-mode="handleTagModeChange"
            @update:untagged-only="handleUntaggedOnlyChange"
            @update:view-mode="viewMode = $event"
            @search="handleSearch"
            @reset="handleResetFilters"
            @batch-delete="requestBatchDelete"
            @batch-tags="batchTagOpen = true"
            @manage-tags="goToTagSettings"
          />
        </div>

        <div
          v-if="galleryLoading"
          :class="viewMode === 'grid'
            ? 'grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5'
            : 'space-y-2'"
        >
          <USkeleton
            v-for="n in 10"
            :key="n"
            :class="viewMode === 'grid' ? 'aspect-[4/3] rounded-lg' : 'h-16 rounded-lg'"
          />
        </div>

        <ImageGrid
          v-else-if="viewMode === 'grid'"
          gallery
          :show-key="false"
          show-storage
          show-tags
          :items="items"
          :selected-keys="selectedKeys"
          :selectable="true"
          :allow-delete="true"
          @update:selected-keys="updateSelectedKeys"
          @preview="openPreview"
          @delete="(image) => requestDelete(image.key)"
          @tag-click="handleTagFilterClick"
          @untagged-click="handleUntaggedFilterClick"
        />

        <GalleryImageList
          v-else
          show-storage
          show-tags
          :items="items"
          :selected-keys="selectedKeys"
          :selectable="true"
          :show-delete="true"
          @update:selected-keys="updateSelectedKeys"
          @preview="openPreview"
          @delete="(image) => requestDelete(image.key)"
          @tag-click="handleTagFilterClick"
          @untagged-click="handleUntaggedFilterClick"
        />

        <ImagePreviewModal
          v-model:open="previewOpen"
          :image="previewImage"
          show-storage
          show-tags
          :deleting="previewImage ? deletingKeys.has(previewImage.key) : false"
          :allow-delete="true"
          @delete="requestPreviewDelete"
        />

        <PaginationBar
          v-if="!galleryLoading && galleryTotal > 0"
          :page="galleryPage"
          :total-pages="galleryTotalPages"
          :total="galleryTotal"
          :page-size="galleryPageSize"
          :unit="t('common.imagesUnit')"
          :loading="galleryLoading"
          @update:page="handleGalleryPageChange"
          @update:page-size="handleGalleryPageSizeChange"
        />
      </section>

      <DeleteConfirmModal
        v-model:open="deleteModalOpen"
        :count="deleteTargetKeys.length"
        :loading="batchDeleting"
        @confirm="confirmDelete"
      />

      <BatchTagModal
        v-model:open="batchTagOpen"
        :tags="tagItems"
        :selected-count="selectedCount"
        @confirm="confirmBatchTags"
      />

      <UButton
        v-show="showScrollTop"
        icon="i-lucide-arrow-up"
        :aria-label="t('stats.scrollTop')"
        color="primary"
        class="fixed bottom-6 right-6 z-50 shadow-lg"
        size="lg"
        @click="scrollToTop"
      />
    </AppShell>
  </div>
</template>
