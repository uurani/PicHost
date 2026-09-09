<script setup lang="ts">
import type { ImageTag } from '~/types/image'

const props = defineProps<{
  open: boolean
  tags: ImageTag[]
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  'changed': []
}>()

const { t } = useI18n()
const { fetchTags } = useTags()

watch(() => props.open, (open) => {
  if (open) void fetchTags(true)
})
</script>

<template>
  <UModal
    :open="open"
    :title="t('tags.manageTitle')"
    :description="t('tags.manageSubtitle')"
    :ui="{ content: 'max-w-5xl' }"
    @update:open="emit('update:open', $event)"
  >
    <template #body>
      <TagManagePanel
        :tags="tags"
        @changed="emit('changed')"
      />
    </template>

    <template #footer>
      <div class="flex w-full justify-end">
        <UButton
          variant="ghost"
          color="neutral"
          @click="emit('update:open', false)"
        >
          {{ t('common.cancel') }}
        </UButton>
      </div>
    </template>
  </UModal>
</template>
