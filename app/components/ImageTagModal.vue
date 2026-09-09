<script setup lang="ts">
import type { ImageItem, ImageTag } from '~/types/image'

const props = defineProps<{
  open: boolean
  image: ImageItem | null
  tags: ImageTag[]
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  'saved': [tags: ImageTag[]]
}>()

const { t } = useI18n()
const toast = useToast()
const { setImageTags, fetchTags } = useTags()
const { recordRecent, loadRecentIds } = useRecentTags()

const selectedTagIds = ref<number[]>([])
const saving = ref(false)

watch(() => props.open, (open) => {
  if (open) {
    selectedTagIds.value = props.image?.tags?.map(tag => tag.id) ?? []
    loadRecentIds()
    void fetchTags(true)
  }
})

async function save() {
  if (!props.image || saving.value) return

  saving.value = true
  try {
    const tags = await setImageTags(props.image.key, selectedTagIds.value)
    recordRecent(selectedTagIds.value)
    emit('saved', tags)
    emit('update:open', false)
    toast.add({ title: t('tags.saved'), color: 'success' })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : t('tags.saveFailed')
    toast.add({ title: message, color: 'error' })
  } finally {
    saving.value = false
  }
}

function onTagCreated(tag: ImageTag) {
  if (!selectedTagIds.value.includes(tag.id)) {
    selectedTagIds.value = [...selectedTagIds.value, tag.id]
  }
}
</script>

<template>
  <UModal
    :open="open"
    :title="t('tags.manageImageTitle')"
    :description="image?.originalName"
    :ui="{ content: 'max-w-md' }"
    @update:open="emit('update:open', $event)"
  >
    <template #body>
      <TagAssignPanel
        v-model="selectedTagIds"
        :tags="tags"
        :disabled="saving"
        @created="onTagCreated"
      />
    </template>

    <template #footer>
      <div class="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p class="flex items-center gap-1.5 text-xs text-muted">
          <UIcon
            name="i-lucide-info"
            class="size-3.5 shrink-0"
          />
          {{ t('tags.classifyHint') }}
        </p>
        <div class="flex justify-end gap-2">
          <UButton
            variant="outline"
            color="neutral"
            :disabled="saving"
            @click="emit('update:open', false)"
          >
            {{ t('common.cancel') }}
          </UButton>
          <UButton
            color="primary"
            :loading="saving"
            @click="save"
          >
            {{ t('common.save') }}
          </UButton>
        </div>
      </div>
    </template>
  </UModal>
</template>
