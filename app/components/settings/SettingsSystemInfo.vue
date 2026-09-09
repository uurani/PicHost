<script setup lang="ts">
defineProps<{
  appVersion: string
  updateAvailable: boolean
  latestVersion: string | null
  releaseUrl: string | null
  checking: boolean
}>()

const emit = defineEmits<{
  checkUpdate: []
}>()

const { t } = useI18n()
</script>

<template>
  <div class="flex flex-wrap items-center justify-between gap-4 py-4">
    <div class="min-w-0">
      <p class="text-sm font-medium text-highlighted">
        {{ t('settings.systemVersion') }}
      </p>
      <p class="mt-1 text-xs leading-relaxed text-muted">
        {{ t('settings.systemVersionHint') }}
      </p>
    </div>
    <div class="flex flex-wrap items-center gap-2">
      <span class="text-sm font-medium tabular-nums text-highlighted">
        v{{ appVersion }}
      </span>
      <UBadge
        v-if="updateAvailable && latestVersion"
        color="warning"
        variant="subtle"
        size="sm"
      >
        {{ t('settings.updateAvailable', { version: `v${latestVersion}` }) }}
      </UBadge>
      <UBadge
        v-else
        color="success"
        variant="subtle"
        size="sm"
      >
        {{ t('settings.upToDate') }}
      </UBadge>
      <UButton
        :label="t('settings.checkUpdate')"
        icon="i-lucide-refresh-cw"
        variant="outline"
        color="neutral"
        size="sm"
        class="shrink-0"
        :loading="checking"
        @click="emit('checkUpdate')"
      />
      <a
        v-if="updateAvailable && latestVersion"
        :href="releaseUrl || 'https://github.com/O96u/PicHost/releases'"
        target="_blank"
        rel="noopener noreferrer"
        class="text-xs text-primary hover:underline"
      >
        {{ t('settings.viewReleases') }}
      </a>
    </div>
  </div>
</template>
