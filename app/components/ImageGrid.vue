<script setup lang="ts">
import type { ImageItem } from '~/types/image'

const props = withDefaults(defineProps<{
  items: ImageItem[]
  selectedKeys: Set<string>
  selectable?: boolean
  showKey?: boolean
  showStorage?: boolean
  emptyText?: string
  dense?: boolean
  compact?: boolean
  /** 图库：5 列 × 2 行，缩略图略扁 */
  gallery?: boolean
  allowDelete?: boolean
  showTags?: boolean
  showTagAction?: boolean
}>(), {
  selectable: true,
  showKey: true,
  showStorage: false,
  dense: false,
  compact: false,
  gallery: false,
  allowDelete: true,
  showTags: false,
  showTagAction: false
})

const gridClass = computed(() => {
  if (props.gallery) {
    return 'grid items-start grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5'
  }
  if (props.dense) {
    return 'grid items-start grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
  }
  return 'grid items-start grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
})

const emit = defineEmits<{
  'update:selectedKeys': [value: Set<string>]
  'preview': [image: ImageItem]
  'delete': [image: ImageItem]
  'tag-click': [tagId: number]
  'untagged-click': []
  'edit-tags': [image: ImageItem]
}>()

const { t } = useI18n()

const displayEmptyText = computed(() => props.emptyText ?? t('image.empty'))

function updateSelection(key: string, selected: boolean) {
  const next = new Set(props.selectedKeys)
  if (selected) next.add(key)
  else next.delete(key)
  emit('update:selectedKeys', next)
}
</script>

<template>
  <div
    v-if="items.length"
    class="items-start"
    :class="gridClass"
  >
    <ImageCard
      v-for="image in items"
      :key="image.key"
      :image="image"
      :selected="selectedKeys.has(image.key)"
      :selectable="selectable"
      :show-key="showKey"
      :show-storage="showStorage"
      :compact="compact"
      :gallery="gallery"
      :allow-delete="allowDelete"
      :show-tags="showTags"
      :show-tag-action="showTagAction"
      @update:selected="updateSelection(image.key, $event)"
      @preview="emit('preview', image)"
      @delete="emit('delete', image)"
      @tag-click="emit('tag-click', $event)"
      @untagged-click="emit('untagged-click')"
      @edit-tags="emit('edit-tags', image)"
    />
  </div>
  <div
    v-else
    class="rounded-xl border border-dashed border-default py-16 text-center text-sm text-muted"
  >
    {{ displayEmptyText }}
  </div>
</template>
