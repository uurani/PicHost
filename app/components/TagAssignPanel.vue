<script setup lang="ts">
import type { ImageTag } from '~/types/image'
import { pickRandomUnusedTagColor, tagPillStyle } from '~/utils/tag-colors'

const props = withDefaults(defineProps<{
  modelValue: number[]
  tags: ImageTag[]
  disabled?: boolean
  allowCreate?: boolean
}>(), {
  disabled: false,
  allowCreate: true
})

const emit = defineEmits<{
  'update:modelValue': [value: number[]]
  'created': [tag: ImageTag]
}>()

const COMMON_LIMIT = 12
const { t } = useI18n()
const toast = useToast()
const { createTag } = useTags()
const { recentIds, loadRecentIds } = useRecentTags()

const query = ref('')
const creating = ref(false)

onMounted(() => {
  loadRecentIds()
})

const isSearching = computed(() => query.value.trim().length > 0)

const selectedTags = computed(() =>
  props.tags.filter(tag => props.modelValue.includes(tag.id))
)

const commonTags = computed(() =>
  [...props.tags]
    .sort((a, b) => (b.imageCount ?? 0) - (a.imageCount ?? 0))
    .slice(0, COMMON_LIMIT)
)

const recentTags = computed(() =>
  recentIds.value
    .map(id => props.tags.find(tag => tag.id === id))
    .filter((tag): tag is ImageTag => Boolean(tag))
)

const existingTags = computed(() => {
  const q = query.value.trim().toLowerCase()
  if (!q) return props.tags
  return props.tags.filter(tag => tag.name.toLowerCase().includes(q))
})

const showCreateOption = computed(() => {
  if (!props.allowCreate) return false
  const q = query.value.trim()
  if (!q) return false
  return !props.tags.some(tag => tag.name === q)
})

const allExistingSelected = computed(() =>
  existingTags.value.length > 0
  && existingTags.value.every(tag => props.modelValue.includes(tag.id))
)

function isSelected(tagId: number) {
  return props.modelValue.includes(tagId)
}

function toggleTag(tagId: number) {
  if (props.disabled) return
  const next = new Set(props.modelValue)
  if (next.has(tagId)) next.delete(tagId)
  else next.add(tagId)
  emit('update:modelValue', [...next])
}

function removeTag(tagId: number) {
  if (props.disabled) return
  emit('update:modelValue', props.modelValue.filter(id => id !== tagId))
}

function clearSelected() {
  if (props.disabled) return
  emit('update:modelValue', [])
}

function toggleSelectAllExisting() {
  if (props.disabled) return
  const visibleIds = existingTags.value.map(tag => tag.id)
  if (allExistingSelected.value) {
    emit('update:modelValue', props.modelValue.filter(id => !visibleIds.includes(id)))
    return
  }
  emit('update:modelValue', [...new Set([...props.modelValue, ...visibleIds])])
}

async function createFromQuery() {
  const name = query.value.trim()
  if (!name || creating.value) return

  creating.value = true
  try {
    const color = pickRandomUnusedTagColor(props.tags.map(tag => tag.color))
    const tag = await createTag(name, color)
    emit('created', tag)
    emit('update:modelValue', [...new Set([...props.modelValue, tag.id])])
    query.value = ''
    toast.add({ title: t('tags.created', { name: tag.name }), color: 'success' })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : t('tags.createFailed')
    toast.add({ title: message, color: 'error' })
  } finally {
    creating.value = false
  }
}

defineExpose({ reloadRecent: loadRecentIds })
</script>

<template>
  <div class="space-y-4">
    <UInput
      v-model="query"
      size="md"
      icon="i-lucide-search"
      :placeholder="t('tags.searchOrCreate')"
      :disabled="disabled"
      @keydown.enter.prevent="showCreateOption ? createFromQuery() : undefined"
    />

    <button
      v-if="showCreateOption"
      type="button"
      class="flex w-full items-center gap-1.5 rounded-lg px-1 py-1 text-left text-sm text-primary hover:bg-primary/5"
      :disabled="disabled || creating"
      @click="createFromQuery"
    >
      <UIcon
        name="i-lucide-plus"
        class="size-4 shrink-0"
      />
      {{ t('tags.createNamed', { name: query.trim() }) }}
    </button>

    <div
      v-if="isSearching && existingTags.length"
      class="space-y-2"
    >
      <div class="flex items-center justify-between gap-2">
        <p class="text-sm font-medium text-highlighted">
          {{ t('tags.existingLabel', { n: existingTags.length }) }}
        </p>
        <button
          type="button"
          class="text-xs text-muted transition-colors hover:text-highlighted"
          :disabled="disabled"
          @click="toggleSelectAllExisting"
        >
          {{ allExistingSelected ? t('tags.deselectAll') : t('tags.selectAll') }}
        </button>
      </div>

      <div class="grid grid-cols-3 gap-2">
        <button
          v-for="tag in existingTags"
          :key="`existing-${tag.id}`"
          type="button"
          class="inline-flex min-w-0 items-center justify-center gap-1 rounded-full border px-2.5 py-1.5 text-xs font-medium transition-opacity hover:opacity-90"
          :style="tagPillStyle(tag.color, isSelected(tag.id))"
          :disabled="disabled"
          @click="toggleTag(tag.id)"
        >
          <UIcon
            v-if="isSelected(tag.id)"
            name="i-lucide-check"
            class="size-3 shrink-0"
          />
          <span class="truncate">{{ tag.name }}</span>
          <UIcon
            v-if="isSelected(tag.id)"
            name="i-lucide-x"
            class="size-3 shrink-0 opacity-80"
          />
        </button>
      </div>
    </div>

    <template v-else>
      <div
        v-if="selectedTags.length"
        class="space-y-2"
      >
        <div class="flex items-center justify-between gap-2">
          <p class="text-sm font-medium text-highlighted">
            {{ t('tags.selectedLabel', { n: selectedTags.length }) }}
          </p>
          <button
            type="button"
            class="text-xs text-muted transition-colors hover:text-highlighted"
            :disabled="disabled"
            @click="clearSelected"
          >
            {{ t('tags.clearSelected') }}
          </button>
        </div>

        <div class="flex flex-wrap gap-2">
          <button
            v-for="tag in selectedTags"
            :key="tag.id"
            type="button"
            class="inline-flex max-w-full items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-opacity hover:opacity-90"
            :style="tagPillStyle(tag.color, true)"
            :disabled="disabled"
            @click="removeTag(tag.id)"
          >
            <UIcon
              name="i-lucide-check"
              class="size-3 shrink-0"
            />
            <span class="truncate">{{ tag.name }}</span>
            <UIcon
              name="i-lucide-x"
              class="size-3 shrink-0 opacity-80"
            />
          </button>
        </div>
      </div>

      <div
        v-if="commonTags.length"
        class="space-y-2"
      >
        <p class="text-sm font-medium text-highlighted">
          {{ t('tags.commonTags') }}
        </p>
        <div class="flex flex-wrap gap-2">
          <button
            v-for="tag in commonTags"
            :key="tag.id"
            type="button"
            class="inline-flex max-w-full items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-opacity hover:opacity-90"
            :style="tagPillStyle(tag.color, isSelected(tag.id))"
            :disabled="disabled"
            @click="toggleTag(tag.id)"
          >
            <UIcon
              v-if="isSelected(tag.id)"
              name="i-lucide-check"
              class="size-3 shrink-0"
            />
            <span class="truncate">{{ tag.name }}</span>
          </button>
        </div>
      </div>

      <div
        v-if="recentTags.length"
        class="space-y-2"
      >
        <p class="text-sm font-medium text-highlighted">
          {{ t('tags.recentTags') }}
        </p>
        <div class="flex flex-wrap gap-2">
          <button
            v-for="tag in recentTags"
            :key="`recent-${tag.id}`"
            type="button"
            class="inline-flex max-w-full items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-opacity hover:opacity-90"
            :style="tagPillStyle(tag.color, isSelected(tag.id))"
            :disabled="disabled"
            @click="toggleTag(tag.id)"
          >
            <UIcon
              v-if="isSelected(tag.id)"
              name="i-lucide-check"
              class="size-3 shrink-0"
            />
            <span class="truncate">{{ tag.name }}</span>
          </button>
        </div>
      </div>
    </template>

    <p
      v-if="!tags.length && !showCreateOption"
      class="py-6 text-center text-sm text-muted"
    >
      {{ t('tags.emptyHint') }}
    </p>
  </div>
</template>
