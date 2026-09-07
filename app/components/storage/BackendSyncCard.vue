<script setup lang="ts">
import type { BackendSyncPreview, SyncDraft } from '~/types/backup'
import type { StorageBackendItem } from '~/types/storage'

const props = defineProps<{
  backends: StorageBackendItem[]
  syncDraft: SyncDraft | null
  highlighted?: boolean
  busy: boolean
  disabled?: boolean
  activeJob?: { progress: number, total: number, message: string } | null
  previewSync: (body: { fromBackendId: string, toBackendId: string }) => Promise<BackendSyncPreview>
}>()

const emit = defineEmits<{
  sync: [body: {
    fromBackendId: string
    toBackendId: string
    deleteSource: boolean
    setDefault: boolean
  }]
}>()

const { t, locale } = useI18n()
const { formatFileSize } = useFileSize()
const toast = useToast()

const fromBackendId = ref('')
const toBackendId = ref('')
const deleteSource = ref(false)
const setDefault = ref(false)
const preview = ref<BackendSyncPreview | null>(null)
const previewLoading = ref(false)
const statsLoading = ref(false)
const confirmOpen = ref(false)
const userTouched = ref(false)

let statsTimer: ReturnType<typeof setTimeout> | null = null

const backendOptions = computed(() =>
  props.backends.map(backend => ({
    label: backend.name,
    value: backend.id
  }))
)

const backendNameById = computed(() =>
  new Map(props.backends.map(backend => [backend.id, backend.name]))
)

const needsMoreBackends = computed(() => props.backends.length < 2)

const syncDisabled = computed(() =>
  props.disabled || props.busy || needsMoreBackends.value
)

function formatCount(value: number) {
  return value.toLocaleString(locale.value)
}

function initDefaultSelection() {
  if (userTouched.value || props.syncDraft) return
  const defaultBackend = props.backends.find(backend => backend.isDefault)
  const target = props.backends.find(backend => !backend.isDefault && backend.enabled)
  if (defaultBackend && target) {
    fromBackendId.value = defaultBackend.id
    toBackendId.value = target.id
    return
  }
  if (props.backends.length >= 2) {
    fromBackendId.value = props.backends[0]!.id
    toBackendId.value = props.backends[1]!.id
  }
}

function canLoadStats(): boolean {
  return !needsMoreBackends.value
    && Boolean(fromBackendId.value)
    && Boolean(toBackendId.value)
    && fromBackendId.value !== toBackendId.value
}

async function refreshStats(immediate = false) {
  if (!canLoadStats()) {
    preview.value = null
    return
  }
  if (immediate) {
    if (statsTimer) clearTimeout(statsTimer)
    await loadStats()
    return
  }
  scheduleStatsLoad()
}

async function loadStats() {
  if (needsMoreBackends.value || !fromBackendId.value || !toBackendId.value) {
    preview.value = null
    return
  }
  if (fromBackendId.value === toBackendId.value) {
    preview.value = null
    return
  }
  statsLoading.value = true
  try {
    preview.value = await props.previewSync({
      fromBackendId: fromBackendId.value,
      toBackendId: toBackendId.value
    })
  } catch {
    preview.value = null
  } finally {
    statsLoading.value = false
  }
}

function scheduleStatsLoad() {
  if (statsTimer) clearTimeout(statsTimer)
  statsTimer = setTimeout(() => {
    void loadStats()
  }, 400)
}

watch(
  () => props.backends,
  async () => {
    initDefaultSelection()
    await nextTick()
    await refreshStats(true)
  },
  { immediate: true }
)

watch(
  () => props.syncDraft,
  async (draft) => {
    if (!draft) return
    fromBackendId.value = draft.fromBackendId
    toBackendId.value = draft.toBackendId
    userTouched.value = true
    await refreshStats(true)
  },
  { immediate: true }
)

watch([fromBackendId, toBackendId], () => {
  void refreshStats()
})

onBeforeUnmount(() => {
  if (statsTimer) clearTimeout(statsTimer)
})

function applyDraft(draft: SyncDraft) {
  fromBackendId.value = draft.fromBackendId
  toBackendId.value = draft.toBackendId
  userTouched.value = true
  void refreshStats(true)
}

defineExpose({ applyDraft })

function backendName(id: string) {
  return backendNameById.value.get(id) ?? id
}

function validateSelection(): boolean {
  if (needsMoreBackends.value) {
    toast.add({ title: t('storage.backup.syncNeedTwoBackends'), color: 'warning' })
    return false
  }
  if (!fromBackendId.value || !toBackendId.value) {
    toast.add({ title: t('storage.backup.syncSelectRequired'), color: 'warning' })
    return false
  }
  if (fromBackendId.value === toBackendId.value) {
    toast.add({ title: t('storage.backup.syncSameBackend'), color: 'warning' })
    return false
  }
  return true
}

async function submit() {
  if (!validateSelection()) return
  previewLoading.value = true
  try {
    preview.value = await props.previewSync({
      fromBackendId: fromBackendId.value,
      toBackendId: toBackendId.value
    })
    confirmOpen.value = true
  } catch {
    toast.add({ title: t('storage.backup.previewFailed'), color: 'error' })
  } finally {
    previewLoading.value = false
  }
}

function confirmSync() {
  emit('sync', {
    fromBackendId: fromBackendId.value,
    toBackendId: toBackendId.value,
    deleteSource: deleteSource.value,
    setDefault: setDefault.value
  })
  confirmOpen.value = false
}
</script>

<template>
  <article
    class="flex h-full flex-col rounded-xl border bg-elevated p-4 transition-colors sm:p-5"
    :class="highlighted ? 'border-primary ring-2 ring-primary/25' : 'border-default'"
  >
    <div class="flex items-start gap-3">
      <div class="flex size-10 shrink-0 items-center justify-center rounded-lg bg-info/10 text-info">
        <UIcon
          name="i-lucide-arrow-left-right"
          class="size-5"
        />
      </div>
      <div class="min-w-0">
        <h3 class="text-base font-semibold">
          {{ t('storage.backup.syncTitle') }}
        </h3>
        <p class="mt-0.5 text-sm text-muted">
          {{ t('storage.backup.syncSubtitle') }}
        </p>
      </div>
    </div>

    <div class="mt-4 flex flex-1 flex-col">
      <UAlert
        v-if="needsMoreBackends"
        color="warning"
        variant="subtle"
        icon="i-lucide-triangle-alert"
        :description="t('storage.backup.syncNeedTwoBackends')"
      />

      <div
        v-else
        class="flex flex-1 flex-col space-y-3"
      >
        <div class="grid gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-end">
          <div class="space-y-1.5">
            <label class="text-xs text-muted">{{ t('storage.backup.syncFrom') }}</label>
            <USelect
              v-model="fromBackendId"
              :items="backendOptions"
              size="sm"
              class="w-full"
              :disabled="syncDisabled"
              @update:model-value="userTouched = true"
            />
          </div>
          <UIcon
            name="i-lucide-arrow-right"
            class="hidden size-4 shrink-0 text-muted sm:mb-2.5 sm:block"
          />
          <div class="space-y-1.5">
            <label class="text-xs text-muted">{{ t('storage.backup.syncTo') }}</label>
            <USelect
              v-model="toBackendId"
              :items="backendOptions"
              size="sm"
              class="w-full"
              :disabled="syncDisabled"
              @update:model-value="userTouched = true"
            />
          </div>
        </div>

        <dl class="space-y-1.5 rounded-lg bg-muted/25 px-3 py-2.5 text-sm">
          <div class="flex items-baseline justify-between gap-2">
            <dt class="text-muted">
              {{ t('storage.backup.syncPendingImages') }}
            </dt>
            <dd class="font-medium tabular-nums">
              <template v-if="statsLoading">
                …
              </template>
              <template v-else-if="preview">
                {{ formatCount(preview.imageCount) }}
              </template>
              <template v-else>
                —
              </template>
            </dd>
          </div>
          <div class="flex items-baseline justify-between gap-2">
            <dt class="text-muted">
              {{ t('storage.backup.syncPendingSize') }}
            </dt>
            <dd class="font-medium tabular-nums">
              <template v-if="statsLoading">
                …
              </template>
              <template v-else-if="preview">
                {{ formatFileSize(preview.imageBytes) }}
              </template>
              <template v-else>
                —
              </template>
            </dd>
          </div>
        </dl>

        <div class="space-y-2 text-xs">
          <label class="flex cursor-pointer items-center gap-2">
            <UCheckbox
              v-model="deleteSource"
              :disabled="syncDisabled"
            />
            <span class="text-muted">{{ t('storage.backup.syncDeleteSource') }}</span>
          </label>
          <label class="flex cursor-pointer items-center gap-2">
            <UCheckbox
              v-model="setDefault"
              :disabled="syncDisabled"
            />
            <span class="text-muted">{{ t('storage.backup.syncSetDefault') }}</span>
          </label>
        </div>

        <div class="mt-auto rounded-lg bg-muted/15 px-3 py-2.5">
          <p class="text-xs font-medium text-default">
            {{ t('storage.backup.syncIncludesTitle') }}
          </p>
          <ul class="mt-2 space-y-1.5 text-xs leading-relaxed text-muted">
            <li class="flex items-start gap-2">
              <UIcon
                name="i-lucide-check"
                class="mt-0.5 size-3.5 shrink-0 text-info"
              />
              <span>{{ t('storage.backup.syncIncludesCopy') }}</span>
            </li>
            <li class="flex items-start gap-2">
              <UIcon
                name="i-lucide-check"
                class="mt-0.5 size-3.5 shrink-0 text-info"
              />
              <span>{{ t('storage.backup.syncIncludesIndex') }}</span>
            </li>
            <li class="flex items-start gap-2">
              <UIcon
                name="i-lucide-minus"
                class="mt-0.5 size-3.5 shrink-0 text-muted"
              />
              <span>{{ t('storage.backup.syncIncludesConfig') }}</span>
            </li>
          </ul>
        </div>

        <StorageBackupJobProgress
          v-if="busy && activeJob"
          class="mt-auto"
          :message="activeJob.message"
          :progress="activeJob.progress"
          :total="activeJob.total"
        />
      </div>
    </div>

    <div
      v-if="!needsMoreBackends"
      class="mt-auto border-t border-default pt-4"
    >
      <UButton
        :label="t('storage.backup.syncPreview')"
        icon="i-lucide-play"
        size="sm"
        :loading="previewLoading || busy"
        :disabled="syncDisabled"
        @click="submit"
      />
    </div>

    <UModal
      v-model:open="confirmOpen"
      :ui="{ content: 'max-w-md' }"
    >
      <template #content>
        <div class="p-5 sm:p-6">
          <h2 class="text-base font-semibold">
            {{ t('storage.backup.syncConfirmTitle') }}
          </h2>
          <p class="mt-2 text-sm text-muted">
            {{ backendName(fromBackendId) }} → {{ backendName(toBackendId) }}
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
                {{ formatCount(preview.imageCount) }}
              </dd>
            </div>
            <div>
              <dt class="text-xs text-muted">
                {{ t('storage.backup.previewSize') }}
              </dt>
              <dd class="mt-0.5 font-semibold tabular-nums">
                {{ formatFileSize(preview.imageBytes) }}
              </dd>
            </div>
          </dl>

          <UAlert
            v-if="deleteSource"
            class="mt-4"
            color="warning"
            variant="subtle"
            icon="i-lucide-triangle-alert"
            :description="t('storage.backup.syncDeleteWarning')"
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
              :label="t('storage.backup.syncConfirm')"
              size="sm"
              icon="i-lucide-play"
              :loading="busy"
              @click="confirmSync"
            />
          </div>
        </div>
      </template>
    </UModal>
  </article>
</template>
