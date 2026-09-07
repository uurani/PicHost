<script setup lang="ts">
import type { BackupJobItem, SyncDraft } from '~/types/backup'
import type { StorageBackendItem } from '~/types/storage'

const props = defineProps<{
  backends: StorageBackendItem[]
}>()

const { t } = useI18n()
const toast = useToast()
const {
  jobs,
  jobsPage,
  jobsPageSize,
  jobsTotal,
  jobsTotalPages,
  jobsLoading,
  estimate,
  packages,
  loadingEstimate,
  polling,
  hasActiveJob,
  getActiveJob,
  loadJobs,
  setJobsPage,
  setJobsPageSize,
  loadEstimate,
  startPolling,
  createExport,
  previewRestore,
  confirmRestore,
  previewSync,
  startSync,
  retryJob,
  cancelJob,
  downloadUrl
} = useBackup()

const syncDraft = ref<SyncDraft | null>(null)
const syncCardRef = ref<{ applyDraft: (draft: SyncDraft) => void } | null>(null)
const panelRef = ref<HTMLElement | null>(null)
const syncHighlighted = ref(false)

const activeJob = computed(() => getActiveJob())
const exportBusy = computed(() => activeJob.value?.type === 'full_export')
const restoreBusy = computed(() => activeJob.value?.type === 'full_restore')
const syncBusy = computed(() => activeJob.value?.type === 'backend_sync')
const anyJobBusy = computed(() => Boolean(activeJob.value))

onMounted(async () => {
  await Promise.all([loadJobs(), loadEstimate()])
  if (hasActiveJob()) {
    startPolling()
  }
})

function applySyncDraft(draft: SyncDraft) {
  syncDraft.value = draft
  syncCardRef.value?.applyDraft(draft)
  syncHighlighted.value = true
  window.setTimeout(() => {
    syncHighlighted.value = false
  }, 2500)
  nextTick(() => {
    panelRef.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  })
  toast.add({ title: t('storage.backup.syncDraftApplied'), color: 'info' })
}

defineExpose({ applySyncDraft })

async function onExport() {
  await createExport()
}

async function onRestore(input: {
  file?: File
  archiveName?: string
  conflictMode: 'skip' | 'overwrite'
}) {
  await confirmRestore(input)
}

async function onCancel(jobId: string) {
  await cancelJob(jobId)
}

async function onSync(body: {
  fromBackendId: string
  toBackendId: string
  deleteSource: boolean
  setDefault: boolean
}) {
  await startSync(body)
}

function onDownload(jobId: string) {
  window.open(downloadUrl(jobId), '_blank')
}

async function onRetry(jobId: string) {
  await retryJob(jobId)
}

function onViewJob(job: BackupJobItem) {
  toast.add({
    title: t('storage.backup.jobTypeRestore'),
    description: job.message,
    color: 'info'
  })
}
</script>

<template>
  <section
    ref="panelRef"
    class="scroll-mt-20 space-y-4 border-t border-default pt-5"
  >
    <header>
      <h2 class="text-base font-semibold">
        {{ t('storage.backup.sectionTitle') }}
      </h2>
      <p class="mt-1 text-sm text-muted">
        {{ t('storage.backup.sectionSubtitle') }}
      </p>
    </header>

    <div class="grid grid-cols-1 items-stretch gap-4 xl:grid-cols-3">
      <StorageBackupExportCard
        class="h-full"
        :estimate="estimate"
        :loading="loadingEstimate"
        :busy="exportBusy"
        :active-job="exportBusy ? activeJob : null"
        :disabled="anyJobBusy && !exportBusy"
        @export="onExport"
      />
      <StorageBackupRestoreCard
        class="h-full"
        :packages="packages"
        :busy="anyJobBusy"
        :restore-busy="restoreBusy"
        :active-job="restoreBusy ? activeJob : null"
        :disabled="anyJobBusy && !restoreBusy"
        :preview-restore="previewRestore"
        @restore="onRestore"
      />
      <StorageBackendSyncCard
        ref="syncCardRef"
        class="h-full"
        :backends="props.backends"
        :sync-draft="syncDraft"
        :highlighted="syncHighlighted"
        :busy="syncBusy"
        :active-job="syncBusy ? activeJob : null"
        :disabled="anyJobBusy && !syncBusy"
        :preview-sync="previewSync"
        @sync="onSync"
      />
    </div>

    <StorageBackupJobTable
      :jobs="jobs"
      :polling="polling"
      :page="jobsPage"
      :total-pages="jobsTotalPages"
      :total="jobsTotal"
      :page-size="jobsPageSize"
      :loading="jobsLoading"
      @update:page="setJobsPage"
      @update:page-size="setJobsPageSize"
      @download="onDownload"
      @retry="onRetry"
      @cancel="onCancel"
      @view="onViewJob"
    />
  </section>
</template>
