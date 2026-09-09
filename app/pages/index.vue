<script setup lang="ts">
import type { ImageItem, ImageTag } from '~/types/image'
import { buildImageBbcode } from '~/utils/image-display'

const { uploading, progressItems, uploadFiles } = useImageUpload()

const {
  autoCopyMarkdown,
  copyFormat,
  loadPreferences
} = useUploadPreferences()

const { items: tagItems, fetchTags, batchUpdateTags } = useTags()
const { recordRecent } = useRecentTags()

const { isChecking, isAuthenticated, checkSession, handleAuthError, fetchStatus } = useAuth()
const toast = useToast()
const { t } = useI18n()
const sessionItems = ref<ImageItem[]>([])
const deletingKeys = ref<Set<string>>(new Set())
const emptySelection = ref(new Set<string>())
const previewOpen = ref(false)
const previewImage = ref<ImageItem | null>(null)
const tagModalOpen = ref(false)
const tagModalImage = ref<ImageItem | null>(null)
const batchTagOpen = ref(false)

const showProgress = computed(
  () =>
    uploading.value
    || progressItems.value.some(
      item =>
        item.status === 'pending'
        || item.status === 'uploading'
        || item.status === 'error'
    )
)

async function loadPage() {
  try {
    loadPreferences()
  } catch (error: unknown) {
    handleAuthError(error)
  }
}

onMounted(async () => {
  const status = await fetchStatus()
  if (!status.initialized && !status.legacyMode) {
    await navigateTo('/setup')
    return
  }
  if (!isAuthenticated.value) {
    await checkSession()
  }
  if (isAuthenticated.value) {
    await Promise.all([loadPage(), fetchTags()])
  }
})

watch(isAuthenticated, async (authed, prev) => {
  if (authed && prev === false) {
    await nextTick()
    await loadPage()
  } else if (!authed) {
    sessionItems.value = []
  }
})

function copyFormatLabel() {
  switch (copyFormat.value) {
    case 'url':
      return t('copy.url')
    case 'html':
      return t('copy.html')
    case 'bbcode':
      return t('copy.bbcode')
    default:
      return t('copy.markdown')
  }
}

async function copyUploadLink(text: string) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
    } else {
      const textarea = document.createElement('textarea')
      textarea.value = text
      textarea.style.position = 'fixed'
      textarea.style.left = '-9999px'
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
    }
    toast.add({ title: t('copy.copiedFormat', { format: copyFormatLabel() }), color: 'success' })
  } catch {
    toast.add({ title: t('copy.failed'), color: 'error' })
  }
}

async function handleUpload(files: File[]) {
  if (!isAuthenticated.value) {
    toast.add({ title: t('upload.loginRequired'), color: 'warning' })
    return
  }

  try {
    const result = await uploadFiles(files)
    if (result?.items.length) {
      sessionItems.value = [...result.items, ...sessionItems.value]
      if (autoCopyMarkdown.value && result.items[0]) {
        const first = result.items[0]
        const text
          = copyFormat.value === 'url'
            ? first.url
            : copyFormat.value === 'html'
              ? first.html
              : copyFormat.value === 'bbcode'
                ? buildImageBbcode(first.url)
                : first.markdown
        if (text) await copyUploadLink(text)
      }
    }
  } catch (error: unknown) {
    handleAuthError(error)
  }
}

async function handleDelete(key: string) {
  deletingKeys.value.add(key)
  try {
    await $fetch('/api/images', {
      method: 'DELETE',
      query: { key }
    })
    sessionItems.value = sessionItems.value.filter(item => item.key !== key)
    if (previewImage.value?.key === key) {
      previewOpen.value = false
      previewImage.value = null
    }
    toast.add({ title: t('stats.deletedSingle'), color: 'success' })
  } catch (error: unknown) {
    handleAuthError(error)
    toast.add({ title: t('stats.deleteFailed'), color: 'error' })
  } finally {
    deletingKeys.value.delete(key)
    deletingKeys.value = new Set(deletingKeys.value)
  }
}

function openPreview(image: ImageItem) {
  previewImage.value = image
  previewOpen.value = true
}

function requestPreviewDelete() {
  if (!previewImage.value) return
  void handleDelete(previewImage.value.key)
}

function openTagModal(image: ImageItem) {
  tagModalImage.value = image
  tagModalOpen.value = true
}

function updateSessionItemTags(key: string, tags: ImageItem['tags']) {
  sessionItems.value = sessionItems.value.map(item =>
    item.key === key ? { ...item, tags } : item
  )
  if (previewImage.value?.key === key) {
    previewImage.value = { ...previewImage.value, tags }
  }
  if (tagModalImage.value?.key === key) {
    tagModalImage.value = { ...tagModalImage.value, tags }
  }
}

function handleTagSaved(tags: ImageTag[]) {
  if (!tagModalImage.value) return
  updateSessionItemTags(tagModalImage.value.key, tags)
}

async function confirmBatchTags(tagIds: number[]) {
  const keys = sessionItems.value.map(item => item.key)
  if (!keys.length || !tagIds.length) return

  try {
    await batchUpdateTags(keys, tagIds, 'add')
    batchTagOpen.value = false
    recordRecent(tagIds)
    toast.add({ title: t('tags.batchSuccess'), color: 'success' })
    await fetchTags(true)
    const addedTags = tagItems.value.filter(tag => tagIds.includes(tag.id))
    sessionItems.value = sessionItems.value.map((item) => {
      const merged = new Map((item.tags ?? []).map(tag => [tag.id, tag]))
      for (const tag of addedTags) merged.set(tag.id, tag)
      return { ...item, tags: [...merged.values()] }
    })
  } catch (error: unknown) {
    handleAuthError(error)
    toast.add({ title: t('tags.batchFailed'), color: 'error' })
  }
}
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
      <UploadFlipCard
        :disabled="uploading"
        @upload="handleUpload"
      />

      <UploadResult
        v-if="showProgress"
        :items="progressItems"
      />

      <section
        v-if="sessionItems.length"
        class="space-y-4"
      >
        <div class="flex items-center justify-between gap-2">
          <h2 class="text-lg font-medium">
            {{ t('upload.sessionTitle') }}
            <span class="ml-1 text-sm font-normal text-muted">({{ sessionItems.length }})</span>
          </h2>
          <UButton
            icon="i-lucide-tags"
            variant="outline"
            color="primary"
            size="sm"
            :label="t('tags.batchTagAll')"
            @click="() => { batchTagOpen = true }"
          />
        </div>

        <ImageGrid
          :items="sessionItems"
          :selected-keys="emptySelection"
          :selectable="false"
          :show-key="false"
          :allow-delete="true"
          show-tag-action
          :empty-text="t('upload.sessionEmpty')"
          @update:selected-keys="() => {}"
          @preview="openPreview"
          @delete="(image) => handleDelete(image.key)"
          @edit-tags="openTagModal"
        />
      </section>

      <ImagePreviewModal
        v-model:open="previewOpen"
        :image="previewImage"
        :deleting="previewImage ? deletingKeys.has(previewImage.key) : false"
        :allow-delete="true"
        @delete="requestPreviewDelete"
      />

      <ImageTagModal
        v-model:open="tagModalOpen"
        :image="tagModalImage"
        :tags="tagItems"
        @saved="handleTagSaved"
      />

      <BatchTagModal
        v-model:open="batchTagOpen"
        :tags="tagItems"
        :selected-count="sessionItems.length"
        add-only
        @confirm="(tagIds) => confirmBatchTags(tagIds)"
      />
    </AppShell>
  </div>
</template>
