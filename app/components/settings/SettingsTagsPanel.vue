<script setup lang="ts">
const { items: tags, loading, fetchTags } = useTags()

onMounted(() => {
  void fetchTags()
})

async function handleChanged() {
  await fetchTags(true)
}
</script>

<template>
  <SettingsPanel>
    <div
      v-if="loading && !tags.length"
      class="flex justify-center py-16"
    >
      <UIcon
        name="i-lucide-loader-circle"
        class="size-6 animate-spin text-muted"
      />
    </div>
    <TagManagePanel
      v-else
      :tags="tags"
      embedded
      @changed="handleChanged"
    />
  </SettingsPanel>
</template>
