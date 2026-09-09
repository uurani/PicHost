<script setup lang="ts">
const emit = defineEmits<{
  back: []
}>()

const {
  compressEnabled,
  autoCopyMarkdown,
  copyFormat,
  clientWebpQuality,
  loadPreferences
} = useUploadPreferences()

const { t } = useI18n()

const {
  userSettings,
  enabled: userAutoDeleteEnabled,
  daysDraft: userAutoDeleteDaysDraft,
  load: loadUserSettings
} = useUserAutoDeleteSettings()

const copyFormatItems = computed(() => [
  { label: t('copy.url'), value: 'url' as const },
  { label: t('copy.markdown'), value: 'markdown' as const },
  { label: t('copy.html'), value: 'html' as const },
  { label: t('copy.bbcode'), value: 'bbcode' as const }
])

const clientQualityLevel = computed(() => {
  if (clientWebpQuality.value >= 85) return t('preferences.qualityHigh')
  if (clientWebpQuality.value >= 60) return t('preferences.qualityMedium')
  return t('preferences.qualityLow')
})

function setCopyFormat(value: 'url' | 'markdown' | 'html' | 'bbcode') {
  copyFormat.value = value
}

function onClientQualityInput(event: Event) {
  const value = Number((event.target as HTMLInputElement).value)
  clientWebpQuality.value = Number.isFinite(value) ? value : 80
}

onMounted(() => {
  loadPreferences()
  void loadUserSettings()
})
</script>

<template>
  <div class="upload-card-surface upload-card-surface--panel flex max-sm:min-h-0 flex-col overflow-hidden max-sm:overflow-visible sm:h-full">
    <div class="flex items-start justify-between gap-3 border-b border-default px-5 py-4 sm:px-6">
      <div class="flex min-w-0 items-start gap-2">
        <UIcon
          name="i-lucide-settings-2"
          class="mt-0.5 size-5 shrink-0 text-primary"
        />
        <div class="min-w-0">
          <h2 class="text-base font-semibold">
            {{ t('preferences.title') }}
          </h2>
          <p class="mt-0.5 text-xs text-muted">
            {{ t('preferences.subtitle') }}
          </p>
        </div>
      </div>
      <UButton
        :label="t('common.back')"
        icon="i-lucide-arrow-left"
        variant="ghost"
        color="neutral"
        size="sm"
        class="shrink-0"
        :aria-label="t('preferences.back')"
        @click="emit('back')"
      />
    </div>

    <div class="flex flex-1 flex-col justify-center p-5 sm:p-6">
      <div class="grid gap-5 sm:grid-cols-3 sm:gap-6">
        <div class="space-y-4">
          <h3 class="text-sm font-semibold">
            {{ t('preferences.processing') }}
          </h3>

          <label class="flex cursor-pointer items-start gap-2.5">
            <UCheckbox
              v-model="compressEnabled"
              class="mt-0.5"
            />
            <span>
              <span class="block text-sm">{{ t('preferences.clientCompress') }}</span>
              <span class="mt-1 block text-xs leading-relaxed text-muted">
                {{ t('preferences.clientCompressHint') }}
              </span>
            </span>
          </label>

          <div
            v-if="userSettings"
            class="border-t border-default pt-4"
          >
            <label class="flex cursor-pointer items-start gap-2.5">
              <UCheckbox
                v-model="userAutoDeleteEnabled"
                class="mt-0.5"
              />
              <span class="min-w-0 flex-1">
                <span class="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm">
                  <span>{{ t('preferences.autoDeletePrefix') }}</span>
                  <UInput
                    v-model.number="userAutoDeleteDaysDraft"
                    type="number"
                    min="1"
                    max="3650"
                    size="xs"
                    class="w-14 tabular-nums"
                    :class="userAutoDeleteEnabled ? '' : 'pointer-events-none opacity-40'"
                  />
                  <span>{{ t('preferences.autoDeleteSuffix') }}</span>
                </span>
                <span class="mt-1 block text-xs leading-relaxed text-muted">
                  {{ t('preferences.autoDeleteHint') }}
                </span>
              </span>
            </label>
          </div>
          <div
            v-else
            class="flex justify-center border-t border-default py-4"
          >
            <UIcon
              name="i-lucide-loader-circle"
              class="size-5 animate-spin text-muted"
            />
          </div>
        </div>

        <div class="space-y-4">
          <h3 class="text-sm font-semibold">
            {{ t('preferences.webpQuality') }}
          </h3>
          <p class="text-xs leading-relaxed text-muted">
            {{ t('preferences.webpQualityHint') }}
          </p>
          <div class="flex items-center justify-between gap-2 text-sm text-muted">
            <span>{{ t('preferences.current', { n: clientWebpQuality }) }}</span>
            <span>{{ clientQualityLevel }}</span>
          </div>
          <input
            type="range"
            min="1"
            max="100"
            :value="clientWebpQuality"
            class="h-2 w-full cursor-pointer appearance-none rounded-full bg-default accent-primary"
            @input="onClientQualityInput"
          >
        </div>

        <div class="space-y-4">
          <h3 class="text-sm font-semibold">
            {{ t('preferences.convenience') }}
          </h3>
          <label class="flex cursor-pointer items-start gap-2.5">
            <UCheckbox
              v-model="autoCopyMarkdown"
              class="mt-0.5"
            />
            <span>
              <span class="block text-sm">{{ t('preferences.autoCopy') }}</span>
              <span class="mt-1 block text-xs leading-relaxed text-muted">
                {{ t('preferences.autoCopyHint') }}
              </span>
            </span>
          </label>
          <div
            class="ml-7 flex gap-1 rounded-lg border border-default p-0.5"
            :class="autoCopyMarkdown ? '' : 'pointer-events-none opacity-40'"
          >
            <UButton
              v-for="item in copyFormatItems"
              :key="item.value"
              size="xs"
              class="flex-1 justify-center"
              :variant="copyFormat === item.value ? 'solid' : 'ghost'"
              :color="copyFormat === item.value ? 'primary' : 'neutral'"
              :label="item.label"
              @click="setCopyFormat(item.value)"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
