<script setup lang="ts">
defineProps<{
  hasChanges: boolean
  saving: boolean
}>()

const emit = defineEmits<{
  save: []
  restore: []
}>()

const { t } = useI18n()
</script>

<template>
  <div class="border-t border-default bg-default px-4 py-4 sm:px-6">
    <div class="flex flex-wrap items-center justify-end gap-3">
      <p
        v-if="hasChanges"
        class="mr-auto text-xs text-warning"
      >
        {{ t('settings.unsavedChanges') }}
      </p>
      <UButton
        :label="t('settings.restoreDefaults')"
        color="neutral"
        variant="outline"
        @click="emit('restore')"
      />
      <UButton
        :label="t('settings.saveSettings')"
        icon="i-lucide-save"
        color="primary"
        :loading="saving"
        :disabled="!hasChanges"
        @click="emit('save')"
      />
    </div>
  </div>
</template>
