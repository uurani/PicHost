<script setup lang="ts">
import type { StorageBackendItem } from '~/types/storage'

const props = defineProps<{
  backend: StorageBackendItem
  envOverride?: boolean
  busy?: boolean
  showMigrateIn?: boolean
  showMigrateOut?: boolean
}>()

const emit = defineEmits<{
  setDefault: []
  edit: []
  test: []
  toggleEnabled: []
  delete: []
  migrateIn: []
  migrateOut: []
}>()

const { t } = useI18n()

const typeIcon = computed(() =>
  props.backend.type === 'local' ? 'i-lucide-hard-drive' : 'i-lucide-cloud'
)

const typeLabel = computed(() =>
  props.backend.type === 'local' ? t('storage.backendLocal') : t('storage.backendCloud')
)

const actionsDisabled = computed(() => props.envOverride || props.busy)

const isLocal = computed(() => props.backend.type === 'local')

function canSetDefault() {
  return !props.backend.isDefault && props.backend.enabled
}

function canEdit() {
  return props.backend.type === 's3'
}

function canToggle() {
  return props.backend.type !== 'local'
}

function canDelete() {
  return props.backend.type !== 'local' && !props.backend.isDefault
}
</script>

<template>
  <article
    class="flex h-full flex-col rounded-xl border border-default bg-elevated p-4 sm:p-5"
    :class="{ 'opacity-75': !backend.enabled }"
  >
    <div class="flex items-start justify-between gap-3">
      <div class="flex min-w-0 items-center gap-3">
        <div class="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <UIcon
            :name="typeIcon"
            class="size-5"
          />
        </div>
        <h3 class="truncate text-base font-semibold">
          {{ backend.name }}
        </h3>
      </div>
      <div class="flex shrink-0 flex-wrap justify-end gap-1.5">
        <span
          v-if="backend.isDefault"
          class="inline-flex rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary"
        >
          {{ t('storage.badgeDefaultStorage') }}
        </span>
        <span
          v-if="isLocal"
          class="inline-flex rounded-md border border-default bg-default px-2 py-0.5 text-xs font-medium text-muted"
        >
          {{ t('storage.badgeLocal') }}
        </span>
        <span
          v-else-if="backend.enabled"
          class="inline-flex rounded-md border border-default bg-default px-2 py-0.5 text-xs font-medium text-muted"
        >
          {{ t('storage.badgeEnabled') }}
        </span>
        <span
          v-else
          class="inline-flex rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted"
        >
          {{ t('storage.badgeDisabled') }}
        </span>
      </div>
    </div>

    <div class="mt-4">
      <StorageUsageBar
        :capacity="backend.capacity"
        :index-bytes="backend.usage.bytes"
      />
    </div>

    <div class="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
      <div class="flex min-w-0 items-center gap-2">
        <span class="shrink-0">{{ t('storage.storageId') }}:</span>
        <code class="min-w-0 truncate font-mono text-dimmed">{{ backend.id }}</code>
        <CopyButton
          icon="i-lucide-copy"
          icon-only
          variant="ghost"
          color="primary"
          class="shrink-0"
          :label="t('common.copy')"
          :value="backend.id"
          :success-title="t('copy.copied')"
        />
      </div>
      <span>
        {{ t('storage.storageType') }}: {{ typeLabel }}
      </span>
    </div>

    <div class="mt-4 flex flex-wrap gap-2 border-t border-default pt-4">
      <UButton
        v-if="canSetDefault()"
        :label="t('storage.setDefault')"
        icon="i-lucide-star"
        size="sm"
        variant="outline"
        color="neutral"
        :disabled="actionsDisabled"
        @click="emit('setDefault')"
      />
      <UButton
        v-if="showMigrateIn"
        :label="t('storage.backup.migrateIn')"
        :title="t('storage.backup.migrateInHint')"
        icon="i-lucide-import"
        size="sm"
        variant="outline"
        color="neutral"
        :disabled="actionsDisabled"
        @click="emit('migrateIn')"
      />
      <UButton
        v-if="showMigrateOut"
        :label="t('storage.backup.migrateOut')"
        :title="t('storage.backup.migrateOutHint')"
        icon="i-lucide-arrow-up-from-line"
        size="sm"
        variant="outline"
        color="neutral"
        :disabled="actionsDisabled"
        @click="emit('migrateOut')"
      />
      <UButton
        v-if="canEdit()"
        :label="t('common.edit')"
        icon="i-lucide-pencil"
        size="sm"
        variant="outline"
        color="neutral"
        :disabled="actionsDisabled"
        @click="emit('edit')"
      />
      <UButton
        :label="t('storage.testConnection')"
        :icon="isLocal ? 'i-lucide-wand-sparkles' : 'i-lucide-activity'"
        size="sm"
        variant="outline"
        color="neutral"
        :loading="busy"
        :disabled="actionsDisabled"
        @click="emit('test')"
      />
      <UButton
        v-if="canToggle()"
        :label="backend.enabled ? t('storage.disable') : t('storage.enable')"
        :icon="backend.enabled ? 'i-lucide-pause' : 'i-lucide-play'"
        size="sm"
        variant="outline"
        color="neutral"
        :disabled="actionsDisabled || (backend.isDefault && backend.enabled)"
        @click="emit('toggleEnabled')"
      />
      <UButton
        v-if="canDelete()"
        :label="t('common.delete')"
        icon="i-lucide-trash-2"
        size="sm"
        variant="outline"
        color="error"
        :disabled="actionsDisabled"
        @click="emit('delete')"
      />
    </div>
  </article>
</template>
