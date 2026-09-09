<script setup lang="ts">
import type { ImageItem } from '~/types/image'
import type { CopyFormat } from '~/composables/useUploadPreferences'
import { buildImageBbcode, formatImageDimensions } from '~/utils/image-display'

const props = withDefaults(defineProps<{
  open: boolean
  image: ImageItem | null
  showStorage?: boolean
  showTags?: boolean
  deleting?: boolean
  allowDelete?: boolean
}>(), {
  showStorage: false,
  showTags: false,
  allowDelete: true
})

const emit = defineEmits<{
  'update:open': [value: boolean]
  'delete': []
}>()

const toast = useToast()

const { formatFileSize } = useFileSize()
const { t, locale } = useI18n()
const { copyFormat } = useUploadPreferences()

const naturalWidth = ref<number | null>(null)
const naturalHeight = ref<number | null>(null)
const dimensionsLoaded = ref(false)
const copyingUrl = ref(false)
const embedFormat = ref<CopyFormat>('url')

const embedFormatItems = computed(() => [
  { label: t('copy.url'), value: 'url' as const },
  { label: t('copy.markdown'), value: 'markdown' as const },
  { label: t('copy.html'), value: 'html' as const },
  { label: t('copy.bbcode'), value: 'bbcode' as const }
])

const uploadedLabel = computed(() => {
  if (!props.image) return '—'
  try {
    const date = new Date(props.image.uploadedAt)
    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, '0')
    const d = String(date.getDate()).padStart(2, '0')
    const h = String(date.getHours()).padStart(2, '0')
    const min = String(date.getMinutes()).padStart(2, '0')
    const s = String(date.getSeconds()).padStart(2, '0')
    return `${y}/${m}/${d} ${h}:${min}:${s}`
  } catch {
    return props.image.uploadedAt
  }
})

const sizeLabel = computed(() => {
  if (!props.image) return '—'
  return t('image.previewSizeDetail', {
    size: formatFileSize(props.image.size),
    bytes: props.image.size.toLocaleString(locale.value)
  })
})

const bbcodeValue = computed(() => {
  if (!props.image) return ''
  return buildImageBbcode(props.image.url)
})

const previewValue = computed(() => {
  if (!props.image) return ''
  switch (embedFormat.value) {
    case 'markdown':
      return props.image.markdown
    case 'html':
      return props.image.html
    case 'bbcode':
      return bbcodeValue.value
    default:
      return props.image.url
  }
})

const copySuccessTitle = computed(() => {
  switch (embedFormat.value) {
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
  props.image?.storage?.type === 'local' ? 'i-lucide-hard-drive' : 'i-lucide-cloud'
)

const uploadSourceTag = computed(() => {
  switch (props.image?.uploadSource) {
    case 'web':
      return t('stats.tagWeb')
    case 'api':
      return t('stats.tagApi')
    default:
      return null
  }
})

const uploadSourceIcon = computed(() => {
  switch (props.image?.uploadSource) {
    case 'web':
      return 'i-lucide-globe'
    case 'api':
      return 'i-lucide-code-xml'
    default:
      return null
  }
})

const dimensionsLabel = computed(() => {
  const formatted = formatImageDimensions(naturalWidth.value, naturalHeight.value)
  if (formatted) return formatted
  return dimensionsLoaded.value ? '—' : t('image.previewDimensionsUnknown')
})

watch(() => props.image?.key, () => {
  naturalWidth.value = null
  naturalHeight.value = null
  dimensionsLoaded.value = false
})

watch(() => props.open, (open) => {
  if (open) {
    embedFormat.value = copyFormat.value
  }
})

function selectEmbedFormat(value: CopyFormat) {
  embedFormat.value = value
  copyFormat.value = value
}

async function copyText(text: string, successTitle: string) {
  if (!text) return false
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
      toast.add({ title: successTitle, color: 'success' })
      return true
    }
  } catch {
    // fallback below
  }

  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.setAttribute('readonly', '')
  textarea.style.position = 'fixed'
  textarea.style.left = '-9999px'
  document.body.appendChild(textarea)
  textarea.select()
  let ok = false
  try {
    ok = document.execCommand('copy')
  } catch {
    ok = false
  } finally {
    document.body.removeChild(textarea)
  }

  if (ok) {
    toast.add({ title: successTitle, color: 'success' })
  } else {
    toast.add({ title: t('copy.failedManual'), color: 'error' })
  }
  return ok
}

async function copyLink() {
  if (!props.image?.url || copyingUrl.value) return
  copyingUrl.value = true
  try {
    await copyText(props.image.url, t('copy.copiedUrl'))
  } finally {
    copyingUrl.value = false
  }
}

function openInNewTab() {
  if (!props.image?.url) return
  window.open(props.image.url, '_blank', 'noopener,noreferrer')
}

function downloadOriginal() {
  if (!props.image?.url) return
  const link = document.createElement('a')
  link.href = props.image.url
  link.download = props.image.originalName || 'image'
  link.rel = 'noopener'
  link.click()
}

function requestDelete() {
  emit('delete')
}

function onImageLoad(event: Event) {
  const img = event.target as HTMLImageElement
  naturalWidth.value = img.naturalWidth
  naturalHeight.value = img.naturalHeight
  dimensionsLoaded.value = true
}
</script>

<template>
  <UModal
    :open="open && !!image"
    :title="t('image.previewTitle')"
    :description="t('image.previewSubtitle')"
    :ui="{ content: 'max-w-5xl' }"
    @update:open="emit('update:open', $event)"
  >
    <template
      v-if="image"
      #body
    >
      <div class="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:items-start">
        <div class="preview-checkerboard flex items-center justify-center overflow-hidden rounded-xl border border-default p-4">
          <img
            :src="image.url"
            :alt="image.originalName"
            class="max-h-[min(60vh,24rem)] w-full object-contain"
            @load="onImageLoad"
          >
        </div>

        <div class="flex min-w-0 flex-col gap-5">
          <dl class="divide-y divide-default text-sm">
            <div class="flex gap-4 py-2.5 first:pt-0">
              <dt class="w-20 shrink-0 text-muted">
                {{ t('image.previewOriginalName') }}
              </dt>
              <dd class="min-w-0 flex-1 break-all font-medium">
                {{ image.originalName }}
              </dd>
            </div>
            <div class="flex gap-4 py-2.5">
              <dt class="w-20 shrink-0 text-muted">
                {{ t('image.previewUploadedAt') }}
              </dt>
              <dd class="min-w-0 flex-1">
                {{ uploadedLabel }}
              </dd>
            </div>
            <div class="flex gap-4 py-2.5">
              <dt class="w-20 shrink-0 text-muted">
                {{ t('image.previewSize') }}
              </dt>
              <dd class="min-w-0 flex-1">
                {{ sizeLabel }}
              </dd>
            </div>
            <div class="flex gap-4 py-2.5">
              <dt class="w-20 shrink-0 text-muted">
                {{ t('image.previewDimensions') }}
              </dt>
              <dd class="min-w-0 flex-1">
                {{ dimensionsLabel }}
              </dd>
            </div>
            <div class="flex gap-4 py-2.5">
              <dt class="w-20 shrink-0 text-muted">
                {{ t('image.previewContentType') }}
              </dt>
              <dd class="min-w-0 flex-1">
                {{ image.contentType }}
              </dd>
            </div>
            <div
              v-if="showStorage && image.storage"
              class="flex gap-4 py-2.5"
            >
              <dt class="w-20 shrink-0 text-muted">
                {{ t('image.previewStorage') }}
              </dt>
              <dd class="min-w-0 flex-1">
                <span class="inline-flex items-center gap-1.5">
                  <UIcon
                    :name="storageIcon"
                    class="size-3.5 shrink-0 text-muted"
                  />
                  {{ image.storage.name }}
                </span>
              </dd>
            </div>
            <div
              v-if="showTags"
              class="flex gap-4 py-2.5"
            >
              <dt class="w-20 shrink-0 text-muted">
                {{ t('tags.column') }}
              </dt>
              <dd class="min-w-0 flex-1">
                <div
                  v-if="image.tags?.length"
                  class="flex flex-wrap gap-1.5"
                >
                  <TagBadge
                    v-for="tag in image.tags"
                    :key="tag.id"
                    :tag="tag"
                  />
                </div>
                <span
                  v-else
                  class="inline-flex rounded-md border border-dashed border-default px-2 py-0.5 text-xs text-muted"
                >
                  {{ t('tags.unlabeled') }}
                </span>
              </dd>
            </div>
            <div
              v-if="uploadSourceTag"
              class="flex gap-4 py-2.5"
            >
              <dt class="w-20 shrink-0 text-muted">
                {{ t('image.previewUploadSource') }}
              </dt>
              <dd class="min-w-0 flex-1">
                <span
                  v-if="uploadSourceIcon"
                  class="inline-flex items-center gap-1 rounded-md border border-default px-2 py-0.5 text-xs text-muted"
                >
                  <UIcon
                    :name="uploadSourceIcon"
                    class="size-3 shrink-0"
                  />
                  {{ uploadSourceTag }}
                </span>
              </dd>
            </div>
            <div
              v-if="image.owner"
              class="flex gap-4 py-2.5"
            >
              <dt class="w-20 shrink-0 text-muted">
                {{ t('image.previewOwner') }}
              </dt>
              <dd class="min-w-0 flex-1">
                {{ image.owner.username }}
              </dd>
            </div>
            <div class="flex gap-4 py-2.5 last:pb-0">
              <dt class="w-20 shrink-0 text-muted">
                {{ t('image.previewKey') }}
              </dt>
              <dd class="flex min-w-0 flex-1 items-start gap-2">
                <span class="min-w-0 flex-1 break-all font-mono text-xs text-dimmed">
                  {{ image.key }}
                </span>
                <CopyButton
                  icon="i-lucide-copy"
                  icon-only
                  variant="ghost"
                  color="neutral"
                  class="shrink-0"
                  :label="t('common.copy')"
                  :value="image.key"
                  :success-title="t('copy.copied')"
                />
              </dd>
            </div>
          </dl>

          <div class="border-t border-default pt-4">
            <p class="mb-2.5 text-sm font-medium">
              {{ t('image.previewLinks') }}
            </p>
            <div class="flex gap-1 rounded-lg border border-default bg-default p-0.5">
              <UButton
                v-for="item in embedFormatItems"
                :key="item.value"
                size="xs"
                class="flex-1 justify-center"
                :variant="embedFormat === item.value ? 'solid' : 'ghost'"
                :color="embedFormat === item.value ? 'primary' : 'neutral'"
                :label="item.label"
                @click="selectEmbedFormat(item.value)"
              />
            </div>
            <div class="mt-2 flex items-center gap-2">
              <UInput
                :model-value="previewValue"
                readonly
                size="sm"
                class="min-w-0 flex-1 font-mono text-xs"
              />
              <CopyButton
                :label="t('common.copy')"
                :value="previewValue"
                :success-title="copySuccessTitle"
              />
            </div>
          </div>
        </div>
      </div>
    </template>

    <template
      v-if="image"
      #footer
    >
      <div class="flex w-full flex-wrap justify-end gap-1.5">
        <UButton
          :label="t('image.previewOpen')"
          icon="i-lucide-external-link"
          color="neutral"
          variant="outline"
          size="sm"
          @click="openInNewTab"
        />
        <UButton
          :label="t('image.previewDownload')"
          icon="i-lucide-download"
          color="neutral"
          variant="outline"
          size="sm"
          @click="downloadOriginal"
        />
        <UButton
          :label="t('image.previewCopyLink')"
          icon="i-lucide-link"
          color="primary"
          size="sm"
          :loading="copyingUrl"
          @click="copyLink"
        />
        <UButton
          v-if="allowDelete"
          :label="t('common.delete')"
          icon="i-lucide-trash-2"
          color="error"
          variant="outline"
          size="sm"
          :loading="deleting"
          @click="requestDelete"
        />
      </div>
    </template>
  </UModal>
</template>

<style scoped>
.preview-checkerboard {
  background-color: var(--ui-bg-muted);
  background-image:
    linear-gradient(45deg, color-mix(in oklab, var(--ui-border) 28%, transparent) 25%, transparent 25%),
    linear-gradient(-45deg, color-mix(in oklab, var(--ui-border) 28%, transparent) 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, color-mix(in oklab, var(--ui-border) 28%, transparent) 75%),
    linear-gradient(-45deg, transparent 75%, color-mix(in oklab, var(--ui-border) 28%, transparent) 75%);
  background-size: 14px 14px;
  background-position: 0 0, 0 7px, 7px -7px, -7px 0;
}
</style>
