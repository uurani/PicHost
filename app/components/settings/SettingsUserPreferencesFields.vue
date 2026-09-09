<script setup lang="ts">
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

function setCopyFormat(value: 'url' | 'markdown' | 'html' | 'bbcode') {
  copyFormat.value = value
}

function onClientQualityInput(event: Event) {
  const value = Number((event.target as HTMLInputElement).value)
  clientWebpQuality.value = Number.isFinite(value) ? value : 80
}

function onClientQualityNumberInput(value: string | number) {
  const num = Number(value)
  clientWebpQuality.value = Number.isFinite(num) ? Math.min(100, Math.max(1, Math.round(num))) : 80
}

onMounted(() => {
  loadPreferences()
  void loadUserSettings()
})
</script>

<template>
  <SettingsSection :title="t('preferences.processing')">
    <SettingsGroup>
      <SettingsToggleRow
        v-model="compressEnabled"
        :title="t('preferences.clientCompress')"
        :hint="t('preferences.clientCompressHint')"
      />
      <div
        v-if="userSettings"
        class="flex items-start justify-between gap-4 py-4"
      >
        <div class="min-w-0 flex-1 pr-2">
          <p class="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm font-medium text-highlighted">
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
          </p>
          <p class="mt-1 text-xs leading-relaxed text-muted">
            {{ t('preferences.autoDeleteHint') }}
          </p>
        </div>
        <USwitch
          v-model="userAutoDeleteEnabled"
          class="mt-0.5 shrink-0"
        />
      </div>
      <div
        v-else
        class="flex justify-center py-4"
      >
        <UIcon
          name="i-lucide-loader-circle"
          class="size-5 animate-spin text-muted"
        />
      </div>
      <div class="py-4">
        <div class="min-w-0">
          <p class="text-sm font-medium text-highlighted">
            {{ t('preferences.webpQuality') }}
          </p>
          <p class="mt-1 text-xs leading-relaxed text-muted">
            {{ t('preferences.webpQualityHint') }}
          </p>
        </div>
        <div class="mt-3 flex items-center gap-3">
          <input
            type="range"
            min="1"
            max="100"
            :value="clientWebpQuality"
            class="h-1.5 min-w-0 flex-1 cursor-pointer appearance-none rounded-full bg-muted accent-primary"
            @input="onClientQualityInput"
          >
          <UInput
            :model-value="clientWebpQuality"
            type="number"
            min="1"
            max="100"
            size="xs"
            class="w-14 shrink-0 tabular-nums"
            @update:model-value="onClientQualityNumberInput"
          />
        </div>
      </div>
    </SettingsGroup>
  </SettingsSection>

  <SettingsSection :title="t('preferences.title')">
    <SettingsGroup>
      <SettingsToggleRow
        v-model="autoCopyMarkdown"
        :title="t('preferences.autoCopy')"
        :hint="t('preferences.autoCopyHint')"
      />
      <div class="py-4">
        <p class="text-sm font-medium text-highlighted">
          {{ t('settings.defaultCopyFormat') }}
        </p>
        <p class="mt-1 text-xs leading-relaxed text-muted">
          {{ t('settings.defaultCopyFormatHint') }}
        </p>
        <div
          class="mt-3 flex w-full max-w-md gap-1 rounded-lg border border-default p-0.5"
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
    </SettingsGroup>
  </SettingsSection>
</template>
