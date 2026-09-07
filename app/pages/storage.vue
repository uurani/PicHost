<script setup lang="ts">
import type { StorageFormPayload } from '~/components/storage/StorageBackendForm.vue'
import type { StorageBackendItem, StorageListResponse } from '~/types/storage'

const { isChecking, isAuthenticated, checkSession, handleAuthError, fetchStatus, isAdmin } = useAuth()
const toast = useToast()
const { t } = useI18n()

const loading = ref(true)
const busyId = ref<string | null>(null)
const storageData = ref<StorageListResponse | null>(null)

const formOpen = ref(false)
const formMode = ref<'create' | 'edit'>('create')
const editingBackend = ref<StorageBackendItem | null>(null)
const formInstanceKey = ref('create')
const savingForm = ref(false)

const deleteOpen = ref(false)
const deleteTarget = ref<StorageBackendItem | null>(null)
const deleteConfirmName = ref('')
const deleting = ref(false)

const backupPanelRef = ref<{ applySyncDraft: (draft: { fromBackendId: string, toBackendId: string }) => void } | null>(null)

function onMigrateIn(backend: StorageBackendItem) {
  const defaultBackend = storageData.value?.backends.find(item => item.isDefault)
  if (!defaultBackend || defaultBackend.id === backend.id) return
  backupPanelRef.value?.applySyncDraft({
    fromBackendId: defaultBackend.id,
    toBackendId: backend.id
  })
}

function onMigrateOut(backend: StorageBackendItem) {
  const backends = storageData.value?.backends ?? []
  if (backend.isDefault) {
    const target = backends.find(item => !item.isDefault && item.enabled)
    if (!target) return
    backupPanelRef.value?.applySyncDraft({
      fromBackendId: backend.id,
      toBackendId: target.id
    })
    return
  }

  const defaultBackend = backends.find(item => item.isDefault)
  if (!defaultBackend) return
  backupPanelRef.value?.applySyncDraft({
    fromBackendId: backend.id,
    toBackendId: defaultBackend.id
  })
}

function showMigrateIn(backend: StorageBackendItem): boolean {
  const backends = storageData.value?.backends ?? []
  return !backend.isDefault
    && backend.enabled
    && backends.some(item => item.isDefault)
}

function showMigrateOut(backend: StorageBackendItem): boolean {
  const backends = storageData.value?.backends ?? []
  if (backend.usage.count === 0) return false
  if (backend.isDefault) {
    return backends.some(item => !item.isDefault && item.enabled)
  }
  return backends.some(item => item.isDefault)
}

const defaultBackendName = computed(() => {
  const backend = storageData.value?.backends.find(item => item.isDefault)
  return backend?.name ?? t('storage.backendLocal')
})

async function loadStorage() {
  loading.value = true
  try {
    storageData.value = await $fetch<StorageListResponse>('/api/admin/storage', {
      credentials: 'include'
    })
  } catch (error: unknown) {
    handleAuthError(error)
    if (isAuthenticated.value) {
      toast.add({ title: t('storage.loadFailed'), color: 'error' })
    }
  } finally {
    loading.value = false
  }
}

const { quotaToBytes } = useFileSize()

function buildPatchBody(payload: StorageFormPayload) {
  const quotaBytes = quotaToBytes(payload.quotaValue, payload.quotaUnit)
  const body: Record<string, unknown> = {
    name: payload.name,
    provider: payload.provider,
    servingMode: payload.servingMode,
    publicUrl: payload.publicUrl,
    quotaBytes,
    config: payload.config
  }
  if (payload.secrets.accessKeyId || payload.secrets.secretAccessKey) {
    body.secrets = payload.secrets
  }
  return body
}

function openCreate() {
  formMode.value = 'create'
  editingBackend.value = null
  formInstanceKey.value = `create-${Date.now()}`
  formOpen.value = true
}

function openEdit(backend: StorageBackendItem) {
  formMode.value = 'edit'
  editingBackend.value = backend
  formInstanceKey.value = backend.id
  formOpen.value = true
}

async function onFormSubmit(payload: StorageFormPayload) {
  if (!quotaToBytes(payload.quotaValue, payload.quotaUnit)) {
    toast.add({ title: t('storage.quotaRequired'), color: 'warning' })
    return
  }

  if (formMode.value === 'create') {
    if (!payload.secrets.accessKeyId || !payload.secrets.secretAccessKey) {
      toast.add({ title: t('storage.secretsRequired'), color: 'warning' })
      return
    }
  }

  savingForm.value = true
  try {
    const body = buildPatchBody(payload)
    if (formMode.value === 'create') {
      await $fetch('/api/admin/storage', {
        method: 'POST',
        credentials: 'include',
        body
      })
      toast.add({ title: t('storage.created'), color: 'success' })
    } else if (editingBackend.value) {
      await $fetch(`/api/admin/storage/${editingBackend.value.id}`, {
        method: 'PATCH',
        credentials: 'include',
        body
      })
      toast.add({ title: t('storage.saved'), color: 'success' })
    }
    formOpen.value = false
    await loadStorage()
  } catch {
    toast.add({ title: t('storage.saveFailed'), color: 'error' })
  } finally {
    savingForm.value = false
  }
}

async function setDefault(backend: StorageBackendItem) {
  busyId.value = backend.id
  try {
    await $fetch(`/api/admin/storage/${backend.id}`, {
      method: 'PATCH',
      credentials: 'include',
      body: { isDefault: true, enabled: true }
    })
    toast.add({ title: t('storage.defaultUpdated'), color: 'success' })
    await loadStorage()
  } catch {
    toast.add({ title: t('storage.saveFailed'), color: 'error' })
  } finally {
    busyId.value = null
  }
}

async function testBackend(backend: StorageBackendItem) {
  busyId.value = backend.id
  try {
    const result = await $fetch<{ ok: boolean, message: string }>(
      `/api/admin/storage/${backend.id}/test`,
      { method: 'POST', credentials: 'include' }
    )
    toast.add({
      title: result.ok ? t('storage.testSuccess') : t('storage.testFailed'),
      description: result.message,
      color: result.ok ? 'success' : 'error'
    })
  } catch {
    toast.add({ title: t('storage.testFailed'), color: 'error' })
  } finally {
    busyId.value = null
  }
}

async function toggleEnabled(backend: StorageBackendItem) {
  busyId.value = backend.id
  try {
    await $fetch(`/api/admin/storage/${backend.id}`, {
      method: 'PATCH',
      credentials: 'include',
      body: { enabled: !backend.enabled }
    })
    await loadStorage()
  } catch {
    toast.add({ title: t('storage.saveFailed'), color: 'error' })
  } finally {
    busyId.value = null
  }
}

function confirmDelete(backend: StorageBackendItem) {
  if (backend.usage.count > 0) {
    toast.add({ title: t('storage.deleteBlockedImages'), color: 'warning' })
    return
  }
  deleteTarget.value = backend
  deleteConfirmName.value = backend.name
  deleteOpen.value = true
}

async function executeDelete() {
  const target = deleteTarget.value
  if (!target) return
  deleting.value = true
  try {
    await $fetch(`/api/admin/storage/${target.id}`, {
      method: 'DELETE',
      credentials: 'include'
    })
    toast.add({ title: t('storage.deleted'), color: 'success' })
    deleteOpen.value = false
    deleteTarget.value = null
    await loadStorage()
  } catch (error: unknown) {
    const message = typeof error === 'object' && error !== null && 'data' in error
      ? String((error as { data?: { message?: string } }).data?.message ?? '')
      : ''
    toast.add({
      title: message || t('storage.deleteFailed'),
      color: 'error'
    })
  } finally {
    deleting.value = false
  }
}

onMounted(async () => {
  const status = await fetchStatus()
  if (!status.initialized && !status.legacyMode) {
    await navigateTo('/setup')
    return
  }
  await checkSession()
  if (!isAuthenticated.value || !isAdmin.value) {
    await navigateTo('/')
    return
  }
  await loadStorage()
})

watch(isAuthenticated, async (authed) => {
  if (authed && isAdmin.value) {
    await loadStorage()
  }
})
</script>

<template>
  <div class="min-h-screen">
    <div
      v-if="isChecking"
      class="flex min-h-screen items-center justify-center"
    >
      <UIcon
        name="i-lucide-loader-circle"
        class="size-8 animate-spin text-muted"
      />
    </div>

    <AdminLoginGate v-else-if="!isAuthenticated" />

    <AppShell v-else-if="isAdmin">
      <div class="flex items-start justify-between gap-3">
        <div class="min-w-0">
          <h1 class="text-2xl font-semibold tracking-tight">
            {{ t('storage.pageTitle') }}
          </h1>
          <p class="text-sm text-muted">
            {{ t('storage.pageSubtitle') }}
          </p>
        </div>

        <UButton
          :label="t('storage.addBackend')"
          icon="i-lucide-plus"
          size="sm"
          :disabled="storageData?.envOverride"
          @click="openCreate"
        />
      </div>

      <section class="mt-5 space-y-5">
        <UAlert
          v-if="storageData?.envOverride"
          color="warning"
          variant="subtle"
          :title="t('storage.envOverride')"
          icon="i-lucide-triangle-alert"
        />

        <div
          v-if="loading"
          class="flex justify-center py-16"
        >
          <UIcon
            name="i-lucide-loader-circle"
            class="size-6 animate-spin text-muted"
          />
        </div>

        <template v-else-if="storageData">
          <StorageOverview
            :backends="storageData.backends"
            :loading="loading"
          />

          <UAlert
            v-if="!storageData.envOverride"
            color="success"
            variant="subtle"
            icon="i-lucide-info"
            :description="t('storage.defaultStorageTip', { name: defaultBackendName })"
          />

          <div class="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <StorageBackendCard
              v-for="backend in storageData.backends"
              :key="backend.id"
              :backend="backend"
              :env-override="storageData.envOverride"
              :busy="busyId === backend.id"
              :show-migrate-in="showMigrateIn(backend)"
              :show-migrate-out="showMigrateOut(backend)"
              @set-default="setDefault(backend)"
              @edit="openEdit(backend)"
              @test="testBackend(backend)"
              @toggle-enabled="toggleEnabled(backend)"
              @delete="confirmDelete(backend)"
              @migrate-in="onMigrateIn(backend)"
              @migrate-out="onMigrateOut(backend)"
            />
          </div>

          <StorageBackupPanel
            v-if="!storageData.envOverride"
            ref="backupPanelRef"
            :backends="storageData.backends"
          />

          <StorageSupportedBackends />
        </template>
      </section>
    </AppShell>

    <UModal
      v-model:open="formOpen"
      :ui="{ content: 'max-w-2xl sm:max-w-3xl' }"
    >
      <template #content>
        <div class="p-5 sm:p-6">
          <h2 class="mb-4 text-base font-semibold">
            {{ formMode === 'create' ? t('storage.addBackend') : t('storage.editBackend') }}
          </h2>
          <div class="max-h-[75vh] overflow-y-auto pr-1">
            <StorageBackendForm
              :key="formInstanceKey"
              :backend="editingBackend"
              :create-mode="formMode === 'create'"
              :saving="savingForm"
              @submit="onFormSubmit"
              @cancel="formOpen = false"
            />
          </div>
        </div>
      </template>
    </UModal>

    <UModal v-model:open="deleteOpen">
      <template #content>
        <div class="p-5 sm:p-6">
          <h2 class="text-base font-semibold">
            {{ t('storage.deleteConfirmTitle') }}
          </h2>
          <p class="mt-2 text-sm text-muted">
            {{ t('storage.deleteConfirmBody', { name: deleteConfirmName }) }}
          </p>
          <div class="mt-5 flex justify-end gap-2">
            <UButton
              :label="t('common.cancel')"
              variant="outline"
              color="neutral"
              @click="() => { deleteOpen = false }"
            />
            <UButton
              :label="t('common.delete')"
              color="error"
              :loading="deleting"
              @click="executeDelete"
            />
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>
