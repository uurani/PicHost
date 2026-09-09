<script setup lang="ts">
const props = withDefaults(defineProps<{
  searchQuery: string
  storageBackend: string
  storageBackendItems: Array<{ label: string, value: string }>
  uploadSource: string
  uploadSourceItems: Array<{ label: string, value: string }>
  tagIds?: number[]
  tagMode?: 'or' | 'and'
  untaggedOnly?: boolean
  tags?: Array<{ id: number, name: string, color: string, imageCount?: number }>
  viewMode: 'grid' | 'list'
  selectedCount?: number
  loading?: boolean
  showBatchDelete?: boolean
  showBatchTags?: boolean
}>(), {
  selectedCount: 0,
  loading: false,
  showBatchDelete: true,
  showBatchTags: false,
  tagIds: () => [],
  tags: () => [],
  tagMode: 'or',
  untaggedOnly: false
})

const emit = defineEmits<{
  'update:searchQuery': [value: string]
  'update:storageBackend': [value: string]
  'update:uploadSource': [value: string]
  'update:tagIds': [value: number[]]
  'update:tagMode': [value: 'or' | 'and']
  'update:untaggedOnly': [value: boolean]
  'update:viewMode': [mode: 'grid' | 'list']
  'search': []
  'reset': []
  'batch-delete': []
  'batch-tags': []
  'manage-tags': []
}>()

const { t } = useI18n()

function setViewMode(mode: 'grid' | 'list') {
  if (mode === props.viewMode || props.loading) return
  emit('update:viewMode', mode)
}

function viewButtonClass(active: boolean) {
  return active
    ? 'border-primary bg-primary/10 text-primary'
    : 'border-transparent bg-elevated text-muted hover:bg-muted hover:text-default'
}
</script>

<template>
  <form
    class="flex flex-nowrap items-center gap-2 overflow-x-auto pb-1"
    @submit.prevent="emit('search')"
  >
    <UInput
      :model-value="searchQuery"
      icon="i-lucide-search"
      :placeholder="t('stats.searchPlaceholder')"
      class="w-40 shrink-0 sm:w-48"
      size="sm"
      :disabled="loading"
      @update:model-value="emit('update:searchQuery', $event)"
    />

    <USelect
      :model-value="storageBackend"
      :items="storageBackendItems"
      class="w-28 shrink-0"
      size="sm"
      :aria-label="t('stats.storage')"
      :disabled="loading"
      @update:model-value="emit('update:storageBackend', $event)"
    />

    <USelect
      :model-value="uploadSource"
      :items="uploadSourceItems"
      class="w-28 shrink-0"
      size="sm"
      :aria-label="t('stats.filterSource')"
      :disabled="loading"
      @update:model-value="emit('update:uploadSource', $event)"
    />

    <TagFilterSelect
      :model-value="tagIds"
      :tag-mode="tagMode"
      :untagged-only="untaggedOnly"
      :tags="tags"
      :disabled="loading"
      @update:model-value="emit('update:tagIds', $event)"
      @update:tag-mode="emit('update:tagMode', $event)"
      @update:untagged-only="emit('update:untaggedOnly', $event)"
      @manage="emit('manage-tags')"
    />

    <UButton
      type="submit"
      icon="i-lucide-search"
      size="sm"
      color="primary"
      class="shrink-0"
      :aria-label="t('common.search')"
      :loading="loading"
    >
      {{ t('common.search') }}
    </UButton>

    <UButton
      type="button"
      icon="i-lucide-rotate-ccw"
      size="sm"
      variant="outline"
      color="neutral"
      class="shrink-0"
      :aria-label="t('stats.resetFilters')"
      :disabled="loading"
      @click="emit('reset')"
    >
      {{ t('stats.resetFilters') }}
    </UButton>

    <UButton
      v-if="showBatchTags"
      type="button"
      icon="i-lucide-tags"
      size="sm"
      variant="outline"
      color="neutral"
      class="shrink-0"
      :disabled="!selectedCount || loading"
      @click="emit('batch-tags')"
    >
      {{ t('tags.batchAdd') }}
    </UButton>

    <UButton
      v-if="showBatchDelete"
      type="button"
      icon="i-lucide-trash-2"
      size="sm"
      variant="outline"
      color="error"
      class="shrink-0"
      :disabled="!selectedCount || loading"
      @click="emit('batch-delete')"
    >
      {{ t('stats.batchDelete') }}
    </UButton>

    <div
      class="inline-flex shrink-0 overflow-hidden rounded-md border border-default"
      role="group"
      :aria-label="t('stats.viewMode')"
    >
      <button
        type="button"
        class="inline-flex size-8 items-center justify-center border-r border-default transition-colors disabled:pointer-events-none disabled:opacity-40"
        :class="viewButtonClass(viewMode === 'grid')"
        :aria-label="t('stats.viewGrid')"
        :aria-pressed="viewMode === 'grid'"
        :disabled="loading"
        @click="setViewMode('grid')"
      >
        <UIcon
          name="i-lucide-layout-grid"
          class="size-4"
        />
      </button>
      <button
        type="button"
        class="inline-flex size-8 items-center justify-center transition-colors disabled:pointer-events-none disabled:opacity-40"
        :class="viewButtonClass(viewMode === 'list')"
        :aria-label="t('stats.viewList')"
        :aria-pressed="viewMode === 'list'"
        :disabled="loading"
        @click="setViewMode('list')"
      >
        <UIcon
          name="i-lucide-list"
          class="size-4"
        />
      </button>
    </div>
  </form>
</template>
