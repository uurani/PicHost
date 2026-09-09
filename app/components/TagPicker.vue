<script setup lang="ts">
import type { ImageTag } from '~/types/image'
import { pickRandomUnusedTagColor } from '~/utils/tag-colors'

const props = withDefaults(defineProps<{
  modelValue: number[]
  tags: ImageTag[]
  disabled?: boolean
  placeholder?: string
  allowCreate?: boolean
  /** 在 Modal 内使用内联列表，避免 Popover 被遮罩挡住 */
  inline?: boolean
  /** 内联列表使用复选框样式 */
  checkbox?: boolean
  /** 隐藏已选标签徽章（弹窗内用复选框列表即可） */
  hideSelectedChips?: boolean
}>(), {
  disabled: false,
  allowCreate: true,
  inline: false,
  checkbox: false,
  hideSelectedChips: false
})

const emit = defineEmits<{
  'update:modelValue': [value: number[]]
  'created': [tag: ImageTag]
}>()

const { t } = useI18n()
const toast = useToast()
const { createTag } = useTags()

const open = ref(false)
const query = ref('')
const creating = ref(false)

const selectedTags = computed(() =>
  props.tags.filter(tag => props.modelValue.includes(tag.id))
)

const filteredTags = computed(() => {
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

function toggleTag(tagId: number) {
  const next = new Set(props.modelValue)
  if (next.has(tagId)) {
    next.delete(tagId)
  } else {
    next.add(tagId)
  }
  emit('update:modelValue', [...next])
}

function removeTag(tagId: number) {
  emit('update:modelValue', props.modelValue.filter(id => id !== tagId))
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
</script>

<template>
  <div class="space-y-2">
    <div
      v-if="selectedTags.length && !hideSelectedChips"
      class="flex flex-wrap gap-1.5"
    >
      <TagBadge
        v-for="tag in selectedTags"
        :key="tag.id"
        :tag="tag"
        removable
        @remove="removeTag(tag.id)"
      />
    </div>

    <div
      v-if="inline"
      class="space-y-2 rounded-lg border border-default p-2"
    >
      <UInput
        v-model="query"
        size="sm"
        icon="i-lucide-search"
        :placeholder="checkbox ? t('tags.search') : t('tags.searchOrCreate')"
        :disabled="disabled"
        @keydown.enter.prevent="showCreateOption ? createFromQuery() : undefined"
      />

      <div class="max-h-48 space-y-1 overflow-y-auto">
        <button
          v-for="tag in filteredTags"
          :key="tag.id"
          type="button"
          class="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-elevated"
          :class="modelValue.includes(tag.id) ? 'bg-primary/10' : ''"
          @click="toggleTag(tag.id)"
        >
          <UCheckbox
            v-if="checkbox"
            :model-value="modelValue.includes(tag.id)"
            class="pointer-events-none"
            @click.stop
          />
          <span
            class="size-2 shrink-0 rounded-full"
            :style="{ backgroundColor: tag.color }"
          />
          <span class="min-w-0 flex-1 truncate">{{ tag.name }}</span>
          <UIcon
            v-if="!checkbox && modelValue.includes(tag.id)"
            name="i-lucide-check"
            class="size-4 text-primary"
          />
        </button>

        <p
          v-if="!filteredTags.length && !showCreateOption"
          class="px-2 py-3 text-center text-xs text-muted"
        >
          {{ tags.length ? t('tags.noMatch') : t('tags.emptyHint') }}
        </p>

        <button
          v-if="showCreateOption"
          type="button"
          class="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-primary hover:bg-elevated"
          :disabled="creating"
          @click="createFromQuery"
        >
          <UIcon
            name="i-lucide-plus"
            class="size-4"
          />
          {{ t('tags.createNamed', { name: query.trim() }) }}
        </button>
      </div>
    </div>

    <UPopover
      v-else
      v-model:open="open"
    >
      <UButton
        type="button"
        size="sm"
        variant="outline"
        color="neutral"
        icon="i-lucide-plus"
        :disabled="disabled"
      >
        {{ placeholder ?? t('tags.addTag') }}
      </UButton>

      <template #content>
        <div class="w-64 space-y-2 p-2">
          <UInput
            v-model="query"
            size="sm"
            icon="i-lucide-search"
            :placeholder="checkbox ? t('tags.search') : t('tags.searchOrCreate')"
            :disabled="disabled"
            @keydown.enter.prevent="showCreateOption ? createFromQuery() : undefined"
          />

          <div class="max-h-48 space-y-1 overflow-y-auto">
            <button
              v-for="tag in filteredTags"
              :key="tag.id"
              type="button"
              class="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-elevated"
              :class="modelValue.includes(tag.id) ? 'bg-primary/10' : ''"
              @click="toggleTag(tag.id)"
            >
              <span
                class="size-2 shrink-0 rounded-full"
                :style="{ backgroundColor: tag.color }"
              />
              <span class="min-w-0 flex-1 truncate">{{ tag.name }}</span>
              <UIcon
                v-if="modelValue.includes(tag.id)"
                name="i-lucide-check"
                class="size-4 text-primary"
              />
            </button>

            <button
              v-if="showCreateOption"
              type="button"
              class="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-primary hover:bg-elevated"
              :disabled="creating"
              @click="createFromQuery"
            >
              <UIcon
                name="i-lucide-plus"
                class="size-4"
              />
              {{ t('tags.createNamed', { name: query.trim() }) }}
            </button>
          </div>
        </div>
      </template>
    </UPopover>
  </div>
</template>
