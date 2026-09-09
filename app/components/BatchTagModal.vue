<script setup lang="ts">
import type { ImageTag } from '~/types/image'

const props = defineProps<{
  open: boolean
  tags: ImageTag[]
  selectedCount: number
  mode?: 'add' | 'remove'
  /** 仅添加标签，隐藏添加/移除切换（首页批量打标） */
  addOnly?: boolean
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  'confirm': [tagIds: number[], action: 'add' | 'remove']
}>()

const { t } = useI18n()
const action = ref<'add' | 'remove'>(props.mode ?? 'add')
const selectedTagIds = ref<number[]>([])
const { loadRecentIds } = useRecentTags()

watch(() => props.open, (open) => {
  if (open) {
    action.value = props.mode ?? 'add'
    selectedTagIds.value = []
    loadRecentIds()
  }
})

function submit() {
  if (!selectedTagIds.value.length) return
  emit('confirm', selectedTagIds.value, action.value)
}
</script>

<template>
  <UModal
    :open="open"
    :title="addOnly ? t('tags.batchAddTitle') : t('tags.batchTitle')"
    :description="addOnly
      ? t('tags.batchAddSubtitle', { n: selectedCount })
      : t('tags.batchSubtitle', { n: selectedCount })"
    :ui="{ content: 'max-w-md' }"
    @update:open="emit('update:open', $event)"
  >
    <template #body>
      <div class="space-y-4">
        <div
          v-if="!addOnly"
          class="flex gap-1 rounded-lg border border-default p-0.5"
        >
          <UButton
            type="button"
            size="xs"
            class="flex-1 justify-center"
            :variant="action === 'add' ? 'solid' : 'ghost'"
            :color="action === 'add' ? 'primary' : 'neutral'"
            :label="t('tags.batchAdd')"
            @click="() => { action = 'add' }"
          />
          <UButton
            type="button"
            size="xs"
            class="flex-1 justify-center"
            :variant="action === 'remove' ? 'solid' : 'ghost'"
            :color="action === 'remove' ? 'primary' : 'neutral'"
            :label="t('tags.batchRemove')"
            @click="() => { action = 'remove' }"
          />
        </div>

        <TagAssignPanel
          v-model="selectedTagIds"
          :tags="tags"
          :allow-create="action === 'add'"
        />
      </div>
    </template>

    <template #footer>
      <div class="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p
          v-if="addOnly"
          class="flex items-center gap-1.5 text-xs text-muted"
        >
          <UIcon
            name="i-lucide-info"
            class="size-3.5 shrink-0"
          />
          {{ t('tags.classifyHint') }}
        </p>
        <div class="flex flex-1 justify-end gap-2">
          <UButton
            variant="outline"
            color="neutral"
            @click="emit('update:open', false)"
          >
            {{ t('common.cancel') }}
          </UButton>
          <UButton
            color="primary"
            :disabled="!selectedTagIds.length"
            @click="submit"
          >
            {{ t('common.save') }}
          </UButton>
        </div>
      </div>
    </template>
  </UModal>
</template>
