<script setup lang="ts">
import type { ImageTag } from '~/types/image'

const props = withDefaults(defineProps<{
  modelValue: number[]
  tagMode: 'or' | 'and'
  untaggedOnly: boolean
  tags: ImageTag[]
  disabled?: boolean
}>(), {
  disabled: false
})

const emit = defineEmits<{
  'update:modelValue': [value: number[]]
  'update:tagMode': [value: 'or' | 'and']
  'update:untaggedOnly': [value: boolean]
  'manage': []
}>()

const { t } = useI18n()

const selectedTags = computed(() =>
  props.tags.filter(tag => props.modelValue.includes(tag.id))
)

const buttonLabel = computed(() => {
  if (props.untaggedOnly) return t('tags.untagged')
  if (!selectedTags.value.length) return t('tags.filterAll')
  if (selectedTags.value.length === 1) return selectedTags.value[0]!.name
  return t('tags.filterSelected', { n: selectedTags.value.length })
})

const tagItems = computed(() =>
  props.tags.map(tag => ({
    label: tag.name,
    value: tag.id
  }))
)

const selectValue = computed({
  get: () => (props.untaggedOnly ? [] : props.modelValue),
  set: (value: number[]) => {
    emit('update:untaggedOnly', false)
    emit('update:modelValue', value)
  }
})

function findTag(tagId: number) {
  return props.tags.find(tag => tag.id === tagId)
}

function selectUntagged() {
  emit('update:modelValue', [])
  emit('update:untaggedOnly', true)
}

function clearFilter() {
  emit('update:modelValue', [])
  emit('update:untaggedOnly', false)
}
</script>

<template>
  <USelect
    v-model="selectValue"
    multiple
    :items="tagItems"
    class="w-28 shrink-0"
    size="sm"
    :disabled="disabled"
    value-key="value"
    :content="{ align: 'start', sideOffset: 4 }"
    :ui="{
      content: 'w-72 max-w-[calc(100vw-2rem)]',
      viewport: 'max-h-44 overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden',
      item: 'text-xs',
      itemLabel: 'text-xs',
      itemTrailingIcon: 'size-3.5 text-primary',
      placeholder: 'truncate pointer-events-none text-highlighted',
      value: 'truncate pointer-events-none text-highlighted'
    }"
  >
    <template #default>
      {{ buttonLabel }}
    </template>

    <template #content-top>
      <div class="space-y-1.5 border-b border-default p-2 text-xs">
        <div class="flex items-center justify-between gap-2 px-0.5">
          <span class="font-medium text-highlighted">{{ t('tags.filterTitle') }}</span>
          <button
            type="button"
            class="text-primary hover:underline"
            @click="emit('manage')"
          >
            {{ t('tags.manage') }}
          </button>
        </div>

        <div
          v-if="modelValue.length > 1"
          class="flex gap-1 rounded-md border border-default p-0.5"
        >
          <button
            type="button"
            class="flex-1 rounded px-2 py-1 text-center transition-colors"
            :class="tagMode === 'or' ? 'bg-primary text-white' : 'text-muted hover:bg-elevated'"
            @click="emit('update:tagMode', 'or')"
          >
            {{ t('tags.modeOr') }}
          </button>
          <button
            type="button"
            class="flex-1 rounded px-2 py-1 text-center transition-colors"
            :class="tagMode === 'and' ? 'bg-primary text-white' : 'text-muted hover:bg-elevated'"
            @click="emit('update:tagMode', 'and')"
          >
            {{ t('tags.modeAnd') }}
          </button>
        </div>

        <div class="space-y-0.5">
          <button
            type="button"
            class="flex w-full items-center rounded-md px-2 py-1 text-left hover:bg-elevated"
            :class="!untaggedOnly && !modelValue.length ? 'bg-primary/10 text-primary' : ''"
            @click="clearFilter"
          >
            {{ t('tags.filterAll') }}
          </button>

          <button
            type="button"
            class="flex w-full items-center rounded-md px-2 py-1 text-left hover:bg-elevated"
            :class="untaggedOnly ? 'bg-primary/10 text-primary' : ''"
            @click="selectUntagged"
          >
            {{ t('tags.untagged') }}
          </button>
        </div>
      </div>
    </template>

    <template #item-leading="{ item }">
      <span
        class="size-2 shrink-0 rounded-full"
        :style="{ backgroundColor: findTag(item.value)?.color }"
      />
    </template>

    <template #item-trailing="{ item }">
      <span class="text-[11px] tabular-nums text-muted">
        {{ findTag(item.value)?.imageCount ?? 0 }}
      </span>
    </template>
  </USelect>
</template>
