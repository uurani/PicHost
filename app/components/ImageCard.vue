<script setup lang="ts">
import type { ImageItem } from '~/types/image'
import type { CopyFormat } from '~/composables/useUploadPreferences'
import { buildImageBbcode } from '~/utils/image-display'

const props = withDefaults(defineProps<{
  image: ImageItem
  selected: boolean
  selectable?: boolean
  showKey?: boolean
  showStorage?: boolean
  compact?: boolean
  gallery?: boolean
  allowDelete?: boolean
  showTags?: boolean
  showTagAction?: boolean
}>(), {
  selectable: true,
  showKey: true,
  showStorage: false,
  compact: false,
  gallery: false,
  allowDelete: true,
  showTags: false,
  showTagAction: false
})

const emit = defineEmits<{
  'update:selected': [value: boolean]
  'preview': []
  'delete': []
  'tag-click': [tagId: number]
  'untagged-click': []
  'edit-tags': []
}>()

const { formatFileSize } = useFileSize()
const { t, locale } = useI18n()
const toast = useToast()
const { copyFormat } = useUploadPreferences()
const imageError = ref(false)
const retryCount = ref(0)

function selectCopyFormat(value: CopyFormat) {
  copyFormat.value = value
}

const MAX_PREVIEW_RETRIES = 3
const PREVIEW_RETRY_DELAYS_MS = [1000, 2000, 4000]

const previewSrc = computed(() => {
  if (retryCount.value === 0) return props.image.url
  const separator = props.image.url.includes('?') ? '&' : '?'
  return `${props.image.url}${separator}retry=${retryCount.value}`
})

watch(() => props.image.key, () => {
  imageError.value = false
  retryCount.value = 0
})

let retryTimer: ReturnType<typeof setTimeout> | undefined

function clearRetryTimer() {
  if (retryTimer !== undefined) {
    clearTimeout(retryTimer)
    retryTimer = undefined
  }
}

function onPreviewError() {
  if (retryCount.value >= MAX_PREVIEW_RETRIES) {
    imageError.value = true
    return
  }

  const delay = PREVIEW_RETRY_DELAYS_MS[retryCount.value] ?? PREVIEW_RETRY_DELAYS_MS.at(-1)!
  clearRetryTimer()
  retryTimer = setTimeout(() => {
    retryCount.value += 1
    retryTimer = undefined
  }, delay)
}

onUnmounted(clearRetryTimer)

const copyFormatItems = computed(() => [
  { label: t('copy.url'), value: 'url' as const },
  { label: t('copy.markdown'), value: 'markdown' as const },
  { label: t('copy.html'), value: 'html' as const },
  { label: t('copy.bbcode'), value: 'bbcode' as const }
])

const uploadedLabel = computed(() => {
  try {
    return new Date(props.image.uploadedAt).toLocaleString(locale.value, { hour12: false })
  } catch {
    return props.image.uploadedAt
  }
})

const previewValue = computed(() => {
  switch (copyFormat.value) {
    case 'markdown':
      return props.image.markdown
    case 'html':
      return props.image.html
    case 'bbcode':
      return buildImageBbcode(props.image.url)
    default:
      return props.image.url
  }
})

const copySuccessTitle = computed(() => {
  switch (copyFormat.value) {
    case 'markdown':
      return t('copy.copiedMarkdown')
    case 'html':
      return t('copy.copiedHtml')
    case 'bbcode':
      return t('copy.copiedBbcode')
    default:
      return t('copy.copiedUrl')
  }
})

const storageIcon = computed(() =>
  props.image.storage?.type === 'local' ? 'i-lucide-hard-drive' : 'i-lucide-cloud'
)

const uploadSourceLabel = computed(() => {
  switch (props.image.uploadSource) {
    case 'web':
      return t('stats.tagWeb')
    case 'api':
      return t('stats.tagApi')
    default:
      return null
  }
})

const uploadSourceIcon = computed(() => {
  switch (props.image.uploadSource) {
    case 'web':
      return 'i-lucide-globe'
    case 'api':
      return 'i-lucide-code-xml'
    default:
      return null
  }
})

const GALLERY_INLINE_TAG_LIMIT = 3

const galleryTagDisplay = computed(() => {
  const tags = props.image.tags ?? []
  if (tags.length <= GALLERY_INLINE_TAG_LIMIT) {
    return { visible: tags, hidden: [] as typeof tags }
  }
  return {
    visible: tags.slice(0, GALLERY_INLINE_TAG_LIMIT),
    hidden: tags.slice(GALLERY_INLINE_TAG_LIMIT)
  }
})
const sessionVisibleTags = computed(() => props.image.tags ?? [])
const sessionTagActionLabel = computed(() =>
  props.image.tags?.length ? t('tags.addTag') : t('tags.untagged')
)

function toggleSelected(value: boolean | 'indeterminate') {
  emit('update:selected', value === true)
}

const copyingUrl = ref(false)

async function copyGalleryUrl() {
  if (copyingUrl.value || !props.image.url) return
  copyingUrl.value = true
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(props.image.url)
    } else {
      const textarea = document.createElement('textarea')
      textarea.value = props.image.url
      textarea.setAttribute('readonly', '')
      textarea.style.position = 'fixed'
      textarea.style.left = '-9999px'
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
    }
    toast.add({ title: t('copy.copiedUrl'), color: 'success' })
  } catch {
    toast.add({ title: t('copy.failedManual'), color: 'error' })
  } finally {
    copyingUrl.value = false
  }
}
</script>

<template>
  <div
    v-if="gallery"
    class="flex flex-col overflow-hidden rounded-xl border border-default bg-elevated"
  >
    <div class="relative aspect-[4/3] shrink-0 overflow-hidden bg-muted">
      <img
        v-if="!imageError"
        :key="`${image.key}-${retryCount}`"
        :src="previewSrc"
        :alt="image.originalName"
        loading="lazy"
        class="size-full cursor-zoom-in object-cover object-center"
        role="button"
        tabindex="0"
        :aria-label="t('image.openPreview')"
        @click="emit('preview')"
        @keydown.enter="emit('preview')"
        @keydown.space.prevent="emit('preview')"
        @error="onPreviewError"
      >
      <div
        v-else
        class="flex size-full items-center justify-center text-xs text-muted"
      >
        {{ t('image.previewFailed') }}
      </div>

      <div
        v-if="selectable"
        class="absolute top-2 left-2"
        @click.stop
      >
        <UCheckbox
          :model-value="selected"
          :ui="{ base: 'shadow-none' }"
          @update:model-value="toggleSelected"
        />
      </div>
    </div>

    <div class="flex flex-col gap-1.5 p-3">
      <p
        class="truncate text-sm font-semibold"
        :title="image.originalName"
      >
        {{ image.originalName }}
      </p>
      <p class="truncate text-xs text-muted">
        {{ uploadedLabel }} · {{ formatFileSize(image.size) }}
      </p>

      <div
        v-if="showTags"
        class="flex flex-wrap items-center gap-1.5"
      >
        <template v-if="image.tags?.length">
          <TagBadge
            v-for="tag in galleryTagDisplay.visible"
            :key="tag.id"
            :tag="tag"
            clickable
            @click="emit('tag-click', tag.id)"
          />
          <UPopover
            v-if="galleryTagDisplay.hidden.length"
            :content="{ side: 'bottom', align: 'start' }"
          >
            <button
              type="button"
              class="inline-flex rounded-md border border-default px-2 py-0.5 text-xs text-muted transition-colors hover:border-primary/40 hover:text-primary"
              :aria-label="t('tags.moreTags', { n: galleryTagDisplay.hidden.length })"
              @click.stop
            >
              +{{ galleryTagDisplay.hidden.length }}
            </button>
            <template #content>
              <div
                class="flex max-w-56 flex-wrap gap-1.5 p-2"
                @click.stop
              >
                <TagBadge
                  v-for="tag in galleryTagDisplay.hidden"
                  :key="tag.id"
                  :tag="tag"
                  clickable
                  @click="emit('tag-click', tag.id)"
                />
              </div>
            </template>
          </UPopover>
        </template>
        <button
          v-else
          type="button"
          class="inline-flex rounded-md border border-dashed border-default px-2 py-0.5 text-xs text-muted transition-colors hover:border-primary/40 hover:text-primary"
          @click.stop="emit('untagged-click')"
        >
          {{ t('tags.unlabeled') }}
        </button>
      </div>

      <div
        v-if="uploadSourceLabel || (showStorage && image.storage)"
        class="flex flex-wrap items-center gap-1.5"
      >
        <span
          v-if="showStorage && image.storage"
          class="inline-flex max-w-full items-center gap-1 rounded-md border border-default px-2 py-0.5 text-xs text-muted"
          :title="image.storage.name"
        >
          <UIcon
            :name="storageIcon"
            class="size-3 shrink-0"
          />
          <span class="truncate">{{ image.storage.name }}</span>
        </span>
        <span
          v-if="uploadSourceLabel && uploadSourceIcon"
          class="inline-flex max-w-full items-center gap-1 rounded-md border border-default px-2 py-0.5 text-xs text-muted"
        >
          <UIcon
            :name="uploadSourceIcon"
            class="size-3 shrink-0"
          />
          <span class="truncate">{{ uploadSourceLabel }}</span>
        </span>
      </div>
    </div>

    <div class="flex items-center justify-around border-t border-default px-2 py-2 text-muted">
      <UButton
        icon="i-lucide-link"
        variant="ghost"
        color="neutral"
        size="sm"
        :loading="copyingUrl"
        :aria-label="t('common.copy')"
        @click="copyGalleryUrl"
      />
      <UButton
        icon="i-lucide-eye"
        variant="ghost"
        color="neutral"
        size="sm"
        :aria-label="t('image.openPreview')"
        @click="emit('preview')"
      />
      <UButton
        v-if="allowDelete"
        icon="i-lucide-trash-2"
        variant="ghost"
        color="neutral"
        size="sm"
        :aria-label="t('common.delete')"
        @click="emit('delete')"
      />
    </div>
  </div>

  <div
    v-else
    class="flex flex-col overflow-hidden rounded-xl border border-default bg-elevated shadow-sm"
  >
    <div
      class="relative aspect-square shrink-0 overflow-hidden bg-muted"
      role="button"
      tabindex="0"
      :aria-label="t('image.openPreview')"
      @click="emit('preview')"
      @keydown.enter="emit('preview')"
      @keydown.space.prevent="emit('preview')"
    >
      <img
        v-if="!imageError"
        :key="`${image.key}-${retryCount}`"
        :src="previewSrc"
        :alt="image.originalName"
        loading="lazy"
        class="absolute inset-0 size-full cursor-zoom-in object-cover object-center"
        @error="onPreviewError"
      >
      <div
        v-else
        class="flex h-full items-center justify-center text-sm text-muted"
      >
        {{ t('image.previewFailed') }}
      </div>
      <div
        v-if="selectable"
        class="absolute top-2 left-2"
        @click.stop
      >
        <UCheckbox
          :model-value="selected"
          @update:model-value="toggleSelected"
        />
      </div>
      <div
        v-if="allowDelete && showTagAction"
        class="absolute top-2 right-2"
        @click.stop
      >
        <UButton
          icon="i-lucide-trash-2"
          variant="solid"
          color="neutral"
          size="xs"
          class="bg-black/55 text-white hover:bg-black/70"
          :aria-label="t('common.delete')"
          @click="emit('delete')"
        />
      </div>
      <div
        v-if="image.owner"
        class="absolute bottom-2 left-2 max-w-[calc(50%-0.5rem)]"
        @click.stop
      >
        <span
          class="inline-flex max-w-full items-center gap-1 rounded-md bg-black/65 px-2 py-0.5 text-xs font-medium text-white shadow-sm backdrop-blur-sm"
          :title="t('image.uploader', { name: image.owner.username })"
        >
          <UIcon
            name="i-lucide-user"
            class="size-3 shrink-0"
          />
          <span class="truncate">{{ image.owner.username }}</span>
        </span>
      </div>
      <div
        v-if="showStorage && image.storage"
        class="absolute bottom-2 max-w-[calc(50%-0.5rem)]"
        :class="image.owner ? 'right-2' : 'left-2'"
        @click.stop
      >
        <span
          class="inline-flex max-w-full items-center gap-1 rounded-md bg-black/65 px-2 py-0.5 text-xs font-medium text-white shadow-sm backdrop-blur-sm"
          :title="t('image.storageBackend', { name: image.storage.name })"
        >
          <UIcon
            :name="storageIcon"
            class="size-3 shrink-0"
          />
          <span class="truncate">{{ image.storage.name }}</span>
        </span>
      </div>
    </div>

    <div
      v-if="compact"
      class="flex items-center gap-1.5 p-2 sm:hidden"
    >
      <div class="min-w-0 flex-1">
        <p
          class="truncate text-xs font-medium"
          :title="image.originalName"
        >
          {{ image.originalName }}
        </p>
        <p class="text-[11px] text-muted">
          {{ formatFileSize(image.size) }}
        </p>
      </div>
      <CopyButton
        icon="i-lucide-copy"
        icon-only
        :label="t('common.copy')"
        :value="image.url"
        :success-title="t('copy.copiedUrl')"
      />
    </div>

    <div
      class="flex flex-1 flex-col gap-2 p-3"
      :class="{ 'hidden sm:flex': compact }"
    >
      <p
        class="truncate text-sm font-medium"
        :title="image.originalName"
      >
        {{ image.originalName }}
      </p>

      <button
        v-if="showTagAction && image.tags?.length"
        type="button"
        class="flex flex-wrap items-center gap-1.5 text-left"
        @click.stop="emit('edit-tags')"
      >
        <TagBadge
          v-for="tag in sessionVisibleTags"
          :key="tag.id"
          :tag="tag"
        />
      </button>

      <p class="text-xs text-muted">
        {{ uploadedLabel }} · {{ formatFileSize(image.size) }}
      </p>

      <div class="flex gap-1 rounded-lg border border-default p-0.5">
        <UButton
          v-for="item in copyFormatItems"
          :key="item.value"
          size="xs"
          class="flex-1 justify-center"
          :variant="copyFormat === item.value ? 'solid' : 'ghost'"
          :color="copyFormat === item.value ? 'primary' : 'neutral'"
          :label="item.label"
          @click="selectCopyFormat(item.value)"
        />
      </div>

      <div class="flex items-center gap-1">
        <UInput
          :model-value="previewValue"
          readonly
          size="xs"
          class="min-w-0 flex-1 font-mono text-xs"
        />
        <CopyButton
          :label="t('common.copy')"
          :variant="showTagAction ? 'solid' : 'soft'"
          :color="showTagAction ? 'primary' : undefined"
          :icon="showTagAction ? undefined : 'i-lucide-copy'"
          :value="previewValue"
          :success-title="copySuccessTitle"
        />
      </div>

      <button
        v-if="showTagAction"
        type="button"
        class="inline-flex items-center gap-1 self-start text-xs text-muted transition-colors hover:text-primary"
        @click.stop="emit('edit-tags')"
      >
        <UIcon
          name="i-lucide-plus"
          class="size-3"
        />
        {{ sessionTagActionLabel }}
      </button>

      <p
        v-if="showKey"
        class="truncate text-xs text-dimmed"
        :title="image.key"
      >
        {{ image.key }}
      </p>
    </div>
  </div>
</template>
