<script setup lang="ts">
import type { BackupPackageItem, BackupRestorePreview } from '~/types/backup'

const props = defineProps<{
  packages: BackupPackageItem[]
  busy: boolean
  disabled?: boolean
  restoreBusy?: boolean
  activeJob?: { progress: number, total: number, message: string } | null
  previewRestore: (input: { file?: File, archiveName?: string }) => Promise<BackupRestorePreview>
}>()

const emit = defineEmits<{
  restore: [input: { file?: File, archiveName?: string, conflictMode: 'skip' | 'overwrite' }]
}>()

const { t, locale } = useI18n()
const { formatFileSize } = useFileSize()
const toast = useToast()

const fileInput = ref<HTMLInputElement | null>(null)
const selectedFile = ref<File | null>(null)
const selectedPackage = ref<string>('')
const conflictMode = ref<'skip' | 'overwrite'>('skip')
const preview = ref<BackupRestorePreview | null>(null)
const previewLoading = ref(false)
const confirmOpen = ref(false)

const conflictItems = computed(() => [
  { label: t('storage.backup.conflictSkip'), value: 'skip' },
  { label: t('storage.backup.conflictOverwrite'), value: 'overwrite' }
])

const selectMenuUi = {
  content: 'min-w-[var(--reka-select-trigger-width)] w-max max-w-[min(100vw-2rem,24rem)]',
  item: 'whitespace-normal',
  itemLabel: 'whitespace-normal'
}

const packageOptions = computed(() =>
  props.packages.map(pkg => ({
    label: `${shortenName(pkg.name)} (${formatFileSize(pkg.bytes)})`,
    value: pkg.name
  }))
)

function shortenName(name: string) {
  if (name.length <= 36) return name
  return `${name.slice(0, 22)}…${name.slice(-10)}`
}

function formatTime(value: string) {
  if (!value) return '—'
  return new Date(value).toLocaleString(locale.value, { hour12: false })
}

function pickFile() {
  fileInput.value?.click()
}

function onFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0] ?? null
  if (!file) return
  selectedFile.value = file
  selectedPackage.value = ''
  preview.value = null
  if (input) input.value = ''
}

function selectPackage(name: string | null) {
  if (!name) {
    selectedPackage.value = ''
    return
  }
  selectedPackage.value = name
  selectedFile.value = null
  preview.value = null
}

async function submit() {
  if (!selectedFile.value && !selectedPackage.value) {
    toast.add({ title: t('storage.backup.restoreSelectRequired'), color: 'warning' })
    return
  }
  previewLoading.value = true
  try {
    preview.value = await props.previewRestore({
      file: selectedFile.value ?? undefined,
      archiveName: selectedPackage.value || undefined
    })
    confirmOpen.value = true
  } catch {
    toast.add({ title: t('storage.backup.previewFailed'), color: 'error' })
  } finally {
    previewLoading.value = false
  }
}

function confirmRestore() {
  emit('restore', {
    file: selectedFile.value ?? undefined,
    archiveName: selectedPackage.value || undefined,
    conflictMode: conflictMode.value
  })
  confirmOpen.value = false
  selectedFile.value = null
  selectedPackage.value = ''
  preview.value = null
}

const sourceLabel = computed(() => selectedFile.value?.name || selectedPackage.value || '')
</script>

<template>
  <article class="flex h-full flex-col rounded-xl border border-default bg-elevated p-4 sm:p-5">
    <div class="flex items-start gap-3">
      <div class="flex size-10 shrink-0 items-center justify-center rounded-lg bg-warning/10 text-warning">
        <UIcon
          name="i-lucide-upload"
          class="size-5"
        />
      </div>
      <div class="min-w-0">
        <h3 class="text-base font-semibold">
          {{ t('storage.backup.restoreTitle') }}
        </h3>
        <p class="mt-0.5 text-sm text-muted">
          {{ t('storage.backup.restoreSubtitle') }}
        </p>
      </div>
    </div>

    <div class="mt-4 flex flex-1 flex-col space-y-3">
      <div class="space-y-1.5">
        <label class="text-xs text-muted">{{ t('storage.backup.restoreUploadLabel') }}</label>
        <button
          type="button"
          class="flex w-full flex-col items-center gap-1.5 rounded-lg border-2 border-dashed px-3 py-2.5 text-center transition-colors disabled:cursor-not-allowed disabled:opacity-60"
          :class="selectedFile
            ? 'border-primary/50 bg-primary/5'
            : 'border-warning/40 bg-warning/5 hover:border-warning/60 hover:bg-warning/10'"
          :disabled="disabled || busy"
          @click="pickFile"
        >
          <div
            class="flex size-8 items-center justify-center rounded-full"
            :class="selectedFile ? 'bg-primary/15 text-primary' : 'bg-warning/15 text-warning'"
          >
            <UIcon
              :name="selectedFile ? 'i-lucide-check' : 'i-lucide-upload'"
              class="size-4.5"
            />
          </div>
          <span class="max-w-full truncate text-sm font-medium text-default">
            {{ selectedFile?.name ?? t('storage.backup.restoreUpload') }}
          </span>
          <span
            v-if="!selectedFile"
            class="text-xs text-muted"
          >
            {{ t('storage.backup.restoreUploadHint') }}
          </span>
        </button>
      </div>

      <div
        v-if="packages.length"
        class="space-y-1.5"
      >
        <label class="text-xs text-muted">{{ t('storage.backup.restoreServerPackages') }}</label>
        <USelect
          :model-value="selectedPackage || undefined"
          :items="packageOptions"
          size="sm"
          class="w-full"
          :ui="selectMenuUi"
          :placeholder="t('storage.backup.restoreServerSelectPlaceholder')"
          :disabled="disabled || busy"
          @update:model-value="selectPackage"
        />
      </div>

      <div class="space-y-2">
        <label class="text-xs text-muted">{{ t('storage.backup.conflictMode') }}</label>
        <URadioGroup
          v-model="conflictMode"
          :items="conflictItems"
          :disabled="disabled || busy"
        />
      </div>

      <StorageBackupJobProgress
        v-if="restoreBusy && activeJob"
        class="mt-auto"
        :message="activeJob.message"
        :progress="activeJob.progress"
        :total="activeJob.total"
      />
    </div>

    <div class="mt-auto border-t border-default pt-4">
      <UButton
        :label="t('storage.backup.restorePreviewConfirm')"
        icon="i-lucide-search"
        size="sm"
        :loading="previewLoading || restoreBusy"
        :disabled="disabled || busy"
        @click="submit"
      />
    </div>

    <input
      ref="fileInput"
      type="file"
      accept=".phost.tar.gz,.tar.gz"
      class="hidden"
      @change="onFileChange"
    >

    <UModal
      v-model:open="confirmOpen"
      :ui="{ content: 'max-w-md' }"
    >
      <template #content>
        <div class="p-5 sm:p-6">
          <h2 class="text-base font-semibold">
            {{ t('storage.backup.restoreConfirmTitle') }}
          </h2>
          <p
            v-if="sourceLabel"
            class="mt-2 truncate font-mono text-xs text-muted"
            :title="sourceLabel"
          >
            {{ sourceLabel }}
          </p>

          <dl
            v-if="preview"
            class="mt-4 grid grid-cols-2 gap-3 text-sm"
          >
            <div>
              <dt class="text-xs text-muted">
                {{ t('storage.backup.previewImages') }}
              </dt>
              <dd class="mt-0.5 font-semibold tabular-nums">
                {{ preview.imageCount }}
              </dd>
            </div>
            <div>
              <dt class="text-xs text-muted">
                {{ t('storage.backup.previewNew') }}
              </dt>
              <dd class="mt-0.5 font-semibold tabular-nums">
                {{ preview.newImages }}
              </dd>
            </div>
            <div>
              <dt class="text-xs text-muted">
                {{ t('storage.backup.previewConflicts') }}
              </dt>
              <dd class="mt-0.5 font-semibold tabular-nums">
                {{ preview.conflictingImages }}
              </dd>
            </div>
            <div>
              <dt class="text-xs text-muted">
                {{ t('storage.backup.previewCreated') }}
              </dt>
              <dd class="mt-0.5 text-xs">
                {{ formatTime(preview.createdAt) }}
              </dd>
            </div>
          </dl>

          <UAlert
            v-if="conflictMode === 'overwrite'"
            class="mt-4"
            color="warning"
            variant="subtle"
            icon="i-lucide-triangle-alert"
            :description="t('storage.backup.restoreOverwriteWarning')"
          />

          <div class="mt-5 flex justify-end gap-2">
            <UButton
              :label="t('common.cancel')"
              size="sm"
              variant="outline"
              color="neutral"
              @click="() => { confirmOpen = false }"
            />
            <UButton
              :label="t('storage.backup.restoreConfirm')"
              size="sm"
              color="warning"
              :loading="restoreBusy"
              @click="confirmRestore"
            />
          </div>
        </div>
      </template>
    </UModal>
  </article>
</template>
