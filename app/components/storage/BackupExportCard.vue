<script setup lang="ts">
import type { BackupEstimate } from '~/types/backup'

defineProps<{
  estimate: BackupEstimate | null
  loading: boolean
  busy: boolean
  disabled?: boolean
  activeJob?: { progress: number, total: number, message: string } | null
}>()

const emit = defineEmits<{
  export: []
}>()

const { t } = useI18n()
const { formatFileSize } = useFileSize()
</script>

<template>
  <article class="flex h-full flex-col rounded-xl border border-default bg-elevated p-4 sm:p-5">
    <div class="flex items-start gap-3">
      <div class="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <UIcon
          name="i-lucide-archive"
          class="size-5"
        />
      </div>
      <div class="min-w-0">
        <h3 class="text-base font-semibold">
          {{ t('storage.backup.exportTitle') }}
        </h3>
        <p class="mt-0.5 text-sm text-muted">
          {{ t('storage.backup.exportSubtitle') }}
        </p>
      </div>
    </div>

    <div class="mt-4 flex flex-1 flex-col space-y-2">
      <div
        v-if="loading"
        class="flex items-center gap-2 text-sm text-muted"
      >
        <UIcon
          name="i-lucide-loader-circle"
          class="size-4 animate-spin"
        />
        {{ t('storage.backup.estimateLoading') }}
      </div>

      <dl
        v-else-if="estimate"
        class="space-y-1.5 rounded-lg bg-muted/25 px-3 py-2.5 text-sm"
      >
        <div class="flex items-baseline justify-between gap-2">
          <dt class="text-muted">
            {{ t('storage.backup.estimateImageCountLabel') }}
          </dt>
          <dd class="font-medium tabular-nums">
            {{ estimate.imageCount }} · {{ formatFileSize(estimate.imageBytes) }}
          </dd>
        </div>
        <div class="flex items-baseline justify-between gap-2">
          <dt class="text-muted">
            {{ t('storage.backup.estimateDatabaseSnapshotLabel') }}
          </dt>
          <dd class="font-medium tabular-nums">
            {{ formatFileSize(estimate.databaseBytes) }}
          </dd>
        </div>
        <div class="flex items-baseline justify-between gap-2 border-t border-default/40 pt-1.5">
          <dt class="font-medium text-default">
            {{ t('storage.backup.estimatePackageSizeLabel') }}
          </dt>
          <dd class="font-semibold tabular-nums">
            {{ formatFileSize(estimate.totalBytes) }}
          </dd>
        </div>
        <div class="flex items-baseline justify-between gap-2 border-t border-default/40 pt-1.5">
          <dt class="text-muted">
            {{ t('storage.backup.estimateStoragePathLabel') }}
          </dt>
          <dd class="truncate font-mono text-xs font-medium">
            {{ t('storage.backup.estimateStoragePathValue') }}
          </dd>
        </div>
      </dl>

      <div
        v-if="estimate && !loading"
        class="mt-auto rounded-lg bg-muted/15 px-3 py-2.5"
      >
        <p class="text-xs font-medium text-default">
          {{ t('storage.backup.exportIncludesTitle') }}
        </p>
        <ul class="mt-2 space-y-1.5 text-xs leading-relaxed text-muted">
          <li class="flex items-start gap-2">
            <UIcon
              name="i-lucide-check"
              class="mt-0.5 size-3.5 shrink-0 text-primary"
            />
            <span>{{ t('storage.backup.exportIncludesDb') }}</span>
          </li>
          <li class="flex items-start gap-2">
            <UIcon
              name="i-lucide-check"
              class="mt-0.5 size-3.5 shrink-0 text-primary"
            />
            <span>{{ t('storage.backup.exportIncludesImages', { count: estimate.imageCount }) }}</span>
          </li>
          <li class="flex items-start gap-2">
            <UIcon
              name="i-lucide-minus"
              class="mt-0.5 size-3.5 shrink-0 text-muted"
            />
            <span>{{ t('storage.backup.exportExcludesSecrets') }}</span>
          </li>
        </ul>
      </div>

      <StorageBackupJobProgress
        v-if="busy && activeJob"
        class="mt-2"
        :message="activeJob.message"
        :progress="activeJob.progress"
        :total="activeJob.total"
      />
    </div>

    <div class="mt-auto border-t border-default pt-4">
      <UButton
        :label="t('storage.backup.exportAction')"
        icon="i-lucide-download"
        size="sm"
        :loading="busy"
        :disabled="disabled || busy"
        @click="emit('export')"
      />
    </div>
  </article>
</template>
