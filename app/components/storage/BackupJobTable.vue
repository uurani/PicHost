<script setup lang="ts">
import type { BackupJobItem } from '~/types/backup'

defineProps<{
  jobs: BackupJobItem[]
  polling: boolean
  page: number
  totalPages: number
  total: number
  pageSize: number
  loading?: boolean
}>()

const emit = defineEmits<{
  'retry': [jobId: string]
  'download': [jobId: string]
  'cancel': [jobId: string]
  'view': [job: BackupJobItem]
  'update:page': [page: number]
  'update:pageSize': [pageSize: number]
}>()

const { t, locale } = useI18n()

function typeLabel(type: BackupJobItem['type']): string {
  const map: Record<BackupJobItem['type'], string> = {
    full_export: t('storage.backup.jobTypeExport'),
    full_restore: t('storage.backup.jobTypeRestore'),
    backend_sync: t('storage.backup.jobTypeSync')
  }
  return map[type]
}

function statusColor(status: BackupJobItem['status']): 'success' | 'error' | 'warning' | 'neutral' {
  if (status === 'done') return 'success'
  if (status === 'failed') return 'error'
  if (status === 'running') return 'warning'
  return 'neutral'
}

function statusLabel(status: BackupJobItem['status']): string {
  const map: Record<BackupJobItem['status'], string> = {
    pending: t('storage.backup.statusPending'),
    running: t('storage.backup.statusRunning'),
    done: t('storage.backup.statusDone'),
    failed: t('storage.backup.statusFailed')
  }
  return map[status]
}

function progressPercent(job: BackupJobItem): number {
  if (!job.total) return job.status === 'done' ? 100 : 0
  return Math.min(100, Math.round((job.progress / job.total) * 100))
}

function jobMessage(job: BackupJobItem): string {
  if (job.status === 'failed') {
    return job.error || job.message || t('storage.backup.jobFailedUnknown')
  }
  if (job.status === 'running' || job.status === 'pending') {
    return job.message
  }
  if (job.status === 'done' && job.message) {
    return job.message
  }
  return ''
}

function canRetry(job: BackupJobItem): boolean {
  return job.type === 'backend_sync' && job.status === 'failed'
}

function canCancel(job: BackupJobItem): boolean {
  return job.status === 'running' || job.status === 'pending'
}

function canView(job: BackupJobItem): boolean {
  return job.type === 'full_restore' && job.status === 'done' && Boolean(job.message)
}

function formatTime(value: string) {
  if (!value) return '—'
  return new Date(value).toLocaleString(locale.value, { hour12: false })
}
</script>

<template>
  <section class="overflow-hidden rounded-xl border border-default bg-elevated">
    <header class="flex items-center justify-between gap-3 border-b border-default/50 px-4 py-4 sm:px-5">
      <div>
        <h3 class="text-sm font-semibold">
          {{ t('storage.backup.jobsTitle') }}
        </h3>
        <p class="mt-0.5 text-xs text-muted">
          {{ t('storage.backup.jobsSubtitle') }}
        </p>
      </div>
      <UIcon
        v-if="polling"
        name="i-lucide-loader-circle"
        class="size-4 shrink-0 animate-spin text-muted"
      />
    </header>

    <div
      v-if="!jobs.length && !loading"
      class="flex flex-col items-center gap-2 px-4 py-12 text-center sm:px-5"
    >
      <UIcon
        name="i-lucide-clipboard-list"
        class="size-7 text-muted"
      />
      <p class="text-sm text-muted">
        {{ t('storage.backup.jobsEmpty') }}
      </p>
    </div>

    <div
      v-else
      class="overflow-x-auto"
    >
      <table class="w-full min-w-[800px] text-left text-sm">
        <thead>
          <tr class="border-b border-default/50 text-xs text-muted">
            <th class="px-4 py-3 font-medium sm:px-5">
              {{ t('storage.backup.colTask') }}
            </th>
            <th class="px-4 py-3 font-medium sm:px-5">
              {{ t('storage.backup.colStatus') }}
            </th>
            <th class="px-4 py-3 font-medium sm:px-5">
              {{ t('storage.backup.colMessage') }}
            </th>
            <th class="px-4 py-3 font-medium sm:px-5">
              {{ t('storage.backup.colProgress') }}
            </th>
            <th class="px-4 py-3 font-medium sm:px-5">
              {{ t('storage.backup.colCreated') }}
            </th>
            <th class="px-4 py-3 font-medium sm:px-5">
              {{ t('storage.backup.colActions') }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="job in jobs"
            :key="job.id"
            class="border-b border-default/40 last:border-0"
          >
            <td class="px-4 py-3.5 whitespace-nowrap font-medium sm:px-5">
              {{ typeLabel(job.type) }}
            </td>
            <td class="px-4 py-3.5 sm:px-5">
              <UBadge
                :color="statusColor(job.status)"
                variant="subtle"
                size="sm"
              >
                {{ statusLabel(job.status) }}
              </UBadge>
            </td>
            <td class="max-w-xs px-4 py-3.5 sm:px-5">
              <p
                v-if="jobMessage(job)"
                class="line-clamp-2 text-xs leading-relaxed"
                :class="job.status === 'failed' ? 'text-error' : 'text-muted'"
                :title="jobMessage(job)"
              >
                {{ jobMessage(job) }}
              </p>
              <span
                v-else
                class="text-xs text-dimmed"
              >—</span>
            </td>
            <td class="min-w-32 px-4 py-3.5 sm:px-5">
              <div class="flex items-center gap-2">
                <div class="h-1 min-w-0 flex-1 overflow-hidden rounded-full bg-muted">
                  <div
                    class="h-full rounded-full bg-primary transition-all"
                    :class="{ 'animate-pulse': job.status === 'running' }"
                    :style="{ width: `${progressPercent(job)}%` }"
                  />
                </div>
                <span class="shrink-0 text-xs tabular-nums text-muted">
                  <template v-if="job.total">{{ job.progress }}/{{ job.total }}</template>
                  <template v-else-if="job.status === 'done'">100%</template>
                  <template v-else>—</template>
                </span>
              </div>
            </td>
            <td class="px-4 py-3.5 whitespace-nowrap text-xs text-muted sm:px-5">
              {{ formatTime(job.createdAt) }}
            </td>
            <td class="px-4 py-3.5 sm:px-5">
              <div class="flex flex-wrap gap-1.5">
                <UButton
                  v-if="job.downloadable"
                  :label="t('storage.backup.download')"
                  icon="i-lucide-download"
                  size="xs"
                  variant="outline"
                  color="neutral"
                  @click="emit('download', job.id)"
                />
                <UButton
                  v-if="canView(job)"
                  :label="t('storage.backup.jobView')"
                  icon="i-lucide-eye"
                  size="xs"
                  variant="outline"
                  color="neutral"
                  @click="emit('view', job)"
                />
                <UButton
                  v-if="canCancel(job)"
                  :label="t('storage.backup.cancel')"
                  icon="i-lucide-x"
                  size="xs"
                  variant="outline"
                  color="warning"
                  @click="emit('cancel', job.id)"
                />
                <UButton
                  v-if="canRetry(job)"
                  :label="t('storage.backup.retry')"
                  icon="i-lucide-rotate-ccw"
                  size="xs"
                  variant="outline"
                  color="neutral"
                  @click="emit('retry', job.id)"
                />
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div
      v-if="total > 0"
      class="border-t border-default/50 px-4 py-4 sm:px-5"
    >
      <PaginationBar
        :page="page"
        :total-pages="totalPages"
        :total="total"
        :page-size="pageSize"
        :loading="loading"
        :unit="t('storage.backup.jobsUnit')"
        @update:page="emit('update:page', $event)"
        @update:page-size="emit('update:pageSize', $event)"
      />
    </div>
  </section>
</template>
