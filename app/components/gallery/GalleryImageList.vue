<script setup lang="ts">
import type { ImageItem, ImageTag } from '~/types/image'

const props = withDefaults(defineProps<{
  items: ImageItem[]
  selectedKeys: Set<string>
  selectable?: boolean
  showStorage?: boolean
  showTags?: boolean
  emptyText?: string
  showDelete?: boolean
}>(), {
  selectable: false,
  showStorage: false,
  showTags: false,
  showDelete: true
})

const emit = defineEmits<{
  'update:selectedKeys': [value: Set<string>]
  'preview': [image: ImageItem]
  'delete': [image: ImageItem]
  'tag-click': [tagId: number]
  'untagged-click': []
}>()

const { t } = useI18n()
const { formatFileSize } = useFileSize()

const INLINE_TAG_LIMIT = 3

const displayEmptyText = computed(() => props.emptyText ?? t('image.empty'))

const allSelected = computed(() =>
  props.items.length > 0 && props.items.every(item => props.selectedKeys.has(item.key))
)

const someSelected = computed(() =>
  props.items.some(item => props.selectedKeys.has(item.key))
)

const headerIndeterminate = computed(() => someSelected.value && !allSelected.value)

function updateSelection(key: string, selected: boolean) {
  const next = new Set(props.selectedKeys)
  if (selected) next.add(key)
  else next.delete(key)
  emit('update:selectedKeys', next)
}

function toggleAll(value: boolean | 'indeterminate') {
  if (value === true) {
    emit('update:selectedKeys', new Set(props.items.map(item => item.key)))
    return
  }
  emit('update:selectedKeys', new Set())
}

function formatUploadedAt(value: string) {
  try {
    const date = new Date(value)
    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, '0')
    const d = String(date.getDate()).padStart(2, '0')
    const h = String(date.getHours()).padStart(2, '0')
    const min = String(date.getMinutes()).padStart(2, '0')
    const s = String(date.getSeconds()).padStart(2, '0')
    return `${y}/${m}/${d} ${h}:${min}:${s}`
  } catch {
    return value
  }
}

function sourceLabel(image: ImageItem) {
  switch (image.uploadSource) {
    case 'web':
      return t('stats.tagWeb')
    case 'api':
      return t('stats.tagApi')
    default:
      return null
  }
}

function sourceIcon(image: ImageItem) {
  switch (image.uploadSource) {
    case 'web':
      return 'i-lucide-globe'
    case 'api':
      return 'i-lucide-code-xml'
    default:
      return null
  }
}

function storageIcon(image: ImageItem) {
  return image.storage?.type === 'local' ? 'i-lucide-hard-drive' : 'i-lucide-cloud'
}

function tagDisplay(tags: ImageTag[] | undefined) {
  const list = tags ?? []
  if (list.length <= INLINE_TAG_LIMIT) {
    return { visible: list, hidden: [] as ImageTag[] }
  }
  return {
    visible: list.slice(0, INLINE_TAG_LIMIT),
    hidden: list.slice(INLINE_TAG_LIMIT)
  }
}

const metaBadgeClass = 'inline-flex max-w-full items-center gap-1 rounded-md border border-default px-1.5 py-0.5 text-[11px] leading-4 text-muted'
</script>

<template>
  <div
    v-if="items.length"
    class="overflow-hidden rounded-xl border border-default bg-default"
  >
    <div class="overflow-x-auto">
      <table class="min-w-full text-xs">
        <thead class="border-b border-default bg-elevated/40 text-muted">
          <tr>
            <th
              v-if="selectable"
              class="w-10 px-3 py-2.5 text-left font-medium"
            >
              <UCheckbox
                :model-value="allSelected ? true : headerIndeterminate ? 'indeterminate' : false"
                :aria-label="t('stats.selectAll')"
                @update:model-value="toggleAll"
              />
            </th>
            <th class="min-w-[14rem] px-3 py-2.5 text-left font-medium">
              {{ t('stats.colFilename') }}
            </th>
            <th class="hidden w-24 px-3 py-2.5 text-left font-medium sm:table-cell">
              {{ t('stats.colSource') }}
            </th>
            <th class="w-20 px-3 py-2.5 text-left font-medium">
              {{ t('stats.colSize') }}
            </th>
            <th
              v-if="showStorage"
              class="hidden w-28 px-3 py-2.5 text-left font-medium md:table-cell"
            >
              {{ t('stats.colType') }}
            </th>
            <th class="hidden w-40 px-3 py-2.5 text-left font-medium lg:table-cell">
              {{ t('stats.colUploadedAt') }}
            </th>
            <th
              v-if="showTags"
              class="min-w-[9rem] px-3 py-2.5 text-left font-medium md:table-cell"
            >
              {{ t('tags.column') }}
            </th>
            <th class="w-24 px-3 py-2.5 text-right font-medium">
              {{ t('stats.colActions') }}
            </th>
          </tr>
        </thead>
        <tbody class="divide-y divide-default">
          <tr
            v-for="image in items"
            :key="image.key"
            class="transition-colors hover:bg-elevated/50"
            :class="selectedKeys.has(image.key) ? 'bg-primary/5' : ''"
          >
            <td
              v-if="selectable"
              class="px-3 py-2"
            >
              <UCheckbox
                :model-value="selectedKeys.has(image.key)"
                @update:model-value="updateSelection(image.key, $event === true)"
              />
            </td>
            <td class="px-3 py-2.5">
              <div class="flex min-w-0 items-center gap-3">
                <button
                  type="button"
                  class="relative size-12 shrink-0 overflow-hidden rounded-md border border-default bg-muted"
                  :aria-label="t('image.openPreview')"
                  @click="emit('preview', image)"
                >
                  <img
                    :src="image.url"
                    :alt="image.originalName"
                    loading="lazy"
                    class="size-full object-cover"
                  >
                </button>
                <p
                  class="min-w-0 flex-1 truncate text-highlighted"
                  :title="image.originalName"
                >
                  {{ image.originalName }}
                </p>
              </div>
            </td>
            <td class="hidden px-3 py-2 sm:table-cell">
              <span
                v-if="sourceLabel(image) && sourceIcon(image)"
                :class="metaBadgeClass"
              >
                <UIcon
                  :name="sourceIcon(image)!"
                  class="size-3 shrink-0"
                />
                <span class="truncate">{{ sourceLabel(image) }}</span>
              </span>
              <span
                v-else
                class="text-muted"
              >—</span>
            </td>
            <td class="px-3 py-2 tabular-nums text-muted">
              {{ formatFileSize(image.size) }}
            </td>
            <td
              v-if="showStorage"
              class="hidden px-3 py-2 md:table-cell"
            >
              <span
                v-if="image.storage"
                :class="metaBadgeClass"
                :title="image.storage.name"
              >
                <UIcon
                  :name="storageIcon(image)"
                  class="size-3 shrink-0"
                />
                <span class="truncate">{{ image.storage.name }}</span>
              </span>
              <span
                v-else
                class="text-muted"
              >—</span>
            </td>
            <td class="hidden px-3 py-2 tabular-nums text-muted lg:table-cell">
              {{ formatUploadedAt(image.uploadedAt) }}
            </td>
            <td
              v-if="showTags"
              class="px-3 py-2 md:table-cell"
            >
              <div
                v-if="image.tags?.length"
                class="flex flex-wrap items-center gap-1"
              >
                <TagBadge
                  v-for="tag in tagDisplay(image.tags).visible"
                  :key="tag.id"
                  :tag="tag"
                  clickable
                  @click="emit('tag-click', tag.id)"
                />
                <UPopover
                  v-if="tagDisplay(image.tags).hidden.length"
                  :content="{ side: 'bottom', align: 'start' }"
                >
                  <button
                    type="button"
                    class="inline-flex rounded-md border border-default px-1.5 py-0.5 text-[11px] text-muted transition-colors hover:border-primary/40 hover:text-primary"
                    :aria-label="t('tags.moreTags', { n: tagDisplay(image.tags).hidden.length })"
                    @click.stop
                  >
                    +{{ tagDisplay(image.tags).hidden.length }}
                  </button>
                  <template #content>
                    <div
                      class="flex max-w-56 flex-wrap gap-1 p-2"
                      @click.stop
                    >
                      <TagBadge
                        v-for="tag in tagDisplay(image.tags).hidden"
                        :key="tag.id"
                        :tag="tag"
                        clickable
                        @click="emit('tag-click', tag.id)"
                      />
                    </div>
                  </template>
                </UPopover>
              </div>
              <button
                v-else
                type="button"
                class="rounded-md border border-dashed border-default px-1.5 py-0.5 text-[11px] text-muted transition-colors hover:border-primary/40 hover:text-primary"
                @click.stop="emit('untagged-click')"
              >
                {{ t('tags.unlabeled') }}
              </button>
            </td>
            <td class="px-3 py-2">
              <div class="flex items-center justify-end gap-0.5 text-muted">
                <CopyButton
                  icon="i-lucide-link"
                  icon-only
                  variant="ghost"
                  color="neutral"
                  :label="t('common.copy')"
                  :value="image.url"
                  :success-title="t('copy.copiedUrl')"
                />
                <UButton
                  icon="i-lucide-eye"
                  variant="ghost"
                  color="neutral"
                  size="xs"
                  :aria-label="t('image.openPreview')"
                  @click="emit('preview', image)"
                />
                <UButton
                  v-if="showDelete"
                  icon="i-lucide-trash-2"
                  variant="ghost"
                  color="neutral"
                  size="xs"
                  :aria-label="t('common.delete')"
                  @click="emit('delete', image)"
                />
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
  <div
    v-else
    class="rounded-xl border border-dashed border-default py-16 text-center text-xs text-muted"
  >
    {{ displayEmptyText }}
  </div>
</template>
