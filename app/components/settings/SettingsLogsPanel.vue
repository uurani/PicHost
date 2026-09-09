<script setup lang="ts">
import type { ActivityLogListResponse, LogAction, LogSource, LogStatus } from '~/types/logs'

const { isAuthenticated, handleAuthError, isAdmin } = useAuth()
const toast = useToast()
const { t, locale } = useI18n()
const { formatFileSize } = useFileSize()

const loading = ref(true)
const page = ref(1)
const pageSize = ref(10)
const actionFilter = ref<'all' | LogAction>('all')
const sourceFilter = ref<'all' | LogSource>('all')
const userFilter = ref<'all' | number>('all')
const dateFrom = ref('')
const dateTo = ref('')
const searchQuery = ref('')
const activeSearch = ref('')
const listData = ref<ActivityLogListResponse | null>(null)

const actionItems = computed(() => [
  { label: t('logs.filterActionAll'), value: 'all' as const },
  { label: t('logs.actionUpload'), value: 'upload' as const },
  { label: t('logs.actionDelete'), value: 'delete' as const },
  { label: t('logs.actionLogin'), value: 'login' as const },
  { label: t('logs.actionEdit'), value: 'edit' as const },
  { label: t('logs.actionSettings'), value: 'settings' as const },
  { label: t('logs.actionTags'), value: 'tags' as const }
])

const sourceItems = computed(() => [
  { label: t('logs.filterSourceAll'), value: 'all' as const },
  { label: t('logs.sourceWeb'), value: 'web' as const },
  { label: t('logs.sourceAdmin'), value: 'admin' as const },
  { label: t('logs.sourceApi'), value: 'api' as const }
])

const userItems = computed(() => {
  const items: Array<{ label: string, value: 'all' | number }> = [
    { label: t('logs.filterUserAll'), value: 'all' }
  ]
  for (const user of listData.value?.users ?? []) {
    items.push({ label: user.username, value: user.id })
  }
  return items
})

function formatTime(value: string) {
  try {
    return new Date(value).toLocaleString(locale.value, { hour12: false })
  } catch {
    return value
  }
}

function formatTimeShort(value: string) {
  try {
    return new Date(value).toLocaleString(locale.value, {
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    })
  } catch {
    return value
  }
}

function actionLabel(action: LogAction) {
  const labels: Record<LogAction, string> = {
    upload: t('logs.actionUpload'),
    delete: t('logs.actionDelete'),
    login: t('logs.actionLogin'),
    edit: t('logs.actionEdit'),
    settings: t('logs.actionSettings'),
    tags: t('logs.actionTags')
  }
  return labels[action]
}

function actionBadgeClass(action: LogAction) {
  const base = 'inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium whitespace-nowrap'
  switch (action) {
    case 'upload':
      return `${base} bg-success/10 text-success`
    case 'delete':
      return `${base} bg-error/10 text-error`
    case 'login':
      return `${base} bg-sky-500/10 text-sky-600 dark:text-sky-400`
    case 'edit':
      return `${base} bg-blue-500/10 text-blue-600 dark:text-blue-400`
    case 'settings':
      return `${base} bg-slate-500/10 text-slate-600 dark:text-slate-400`
    case 'tags':
      return `${base} bg-violet-500/10 text-violet-600 dark:text-violet-400`
  }
}

function actionIcon(action: LogAction) {
  switch (action) {
    case 'upload':
      return 'i-lucide-upload'
    case 'delete':
      return 'i-lucide-trash-2'
    case 'login':
      return 'i-lucide-log-in'
    case 'edit':
      return 'i-lucide-pencil'
    case 'settings':
      return 'i-lucide-settings'
    case 'tags':
      return 'i-lucide-tag'
  }
}

function sourceIcon(source: LogSource) {
  switch (source) {
    case 'web':
      return 'i-lucide-monitor'
    case 'admin':
      return 'i-lucide-layout-dashboard'
    case 'api':
      return 'i-lucide-code-2'
  }
}

function sourceLabel(source: LogSource) {
  switch (source) {
    case 'web':
      return t('logs.sourceWeb')
    case 'admin':
      return t('logs.sourceAdmin')
    case 'api':
      return t('logs.sourceApi')
  }
}

function sourceBadgeClass(source: LogSource) {
  const base = 'inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium whitespace-nowrap'
  switch (source) {
    case 'web':
      return `${base} bg-primary/10 text-primary`
    case 'admin':
      return `${base} bg-orange-500/10 text-orange-600 dark:text-orange-400`
    case 'api':
      return `${base} bg-violet-500/10 text-violet-600 dark:text-violet-400`
  }
}

function statusLabel(status: LogStatus) {
  return status === 'failure' ? t('logs.resultFailure') : t('logs.resultSuccess')
}

function statusDotClass(status: LogStatus) {
  return status === 'failure' ? 'bg-error' : 'bg-success'
}

function formatIp(value: string | null) {
  if (!value || value === '-') return '—'
  return value
}

function formatSize(action: LogAction, size: number) {
  if (action !== 'upload' && action !== 'delete') return '—'
  if (action === 'delete' && size <= 0) return '—'
  return formatFileSize(size)
}

async function loadLogs() {
  loading.value = true
  try {
    const query: Record<string, string | number> = {
      page: page.value,
      limit: pageSize.value
    }
    if (actionFilter.value !== 'all') {
      query.action = actionFilter.value
    }
    if (sourceFilter.value !== 'all') {
      query.source = sourceFilter.value
    }
    if (isAdmin.value && userFilter.value !== 'all') {
      query.userId = userFilter.value
    }
    if (activeSearch.value) {
      query.q = activeSearch.value
    }
    if (dateFrom.value) {
      query.from = dateFrom.value
    }
    if (dateTo.value) {
      query.to = dateTo.value
    }

    listData.value = await $fetch<ActivityLogListResponse>('/api/logs', {
      credentials: 'include',
      query
    })
    page.value = listData.value.page
  } catch (error: unknown) {
    handleAuthError(error)
    if (isAuthenticated.value) {
      toast.add({ title: t('logs.loadFailed'), color: 'error' })
    }
  } finally {
    loading.value = false
  }
}

function applyFilters() {
  page.value = 1
  void loadLogs()
}

function submitSearch() {
  activeSearch.value = searchQuery.value.trim()
  applyFilters()
}

function clearSearch() {
  searchQuery.value = ''
  activeSearch.value = ''
  applyFilters()
}

function handlePageChange(target: number) {
  page.value = target
  void loadLogs()
}

function handlePageSizeChange(size: number) {
  pageSize.value = size
  page.value = 1
  void loadLogs()
}

onMounted(() => {
  void loadLogs()
})
</script>

<template>
  <div class="min-w-0">
    <div class="mb-6 flex items-start justify-between gap-4">
      <div class="min-w-0">
        <div class="flex items-center gap-2">
          <span
            class="h-4 w-1 shrink-0 rounded-full bg-primary"
            aria-hidden="true"
          />
          <h2 class="text-sm font-semibold text-highlighted">
            {{ t('logs.pageTitle') }}
          </h2>
        </div>
        <p class="mt-1.5 pl-3 text-xs leading-relaxed text-muted">
          {{ isAdmin ? t('settings.pageSubtitleLogs') : t('logs.pageSubtitle') }}
        </p>
      </div>
      <UButton
        icon="i-lucide-refresh-cw"
        variant="outline"
        color="neutral"
        size="sm"
        :label="t('common.refresh')"
        :loading="loading"
        class="shrink-0"
        @click="loadLogs"
      />
    </div>

    <form
      class="mb-4 flex flex-col gap-3"
      @submit.prevent="submitSearch"
    >
      <div class="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div class="flex min-w-0 flex-wrap items-center gap-2">
          <UInput
            v-model="dateFrom"
            type="date"
            size="sm"
            class="min-w-0 w-full sm:w-36"
            :aria-label="t('logs.dateFrom')"
            :disabled="loading"
            @change="applyFilters"
          />
          <span class="hidden text-xs text-muted sm:inline">{{ t('logs.dateRangeSeparator') }}</span>
          <UInput
            v-model="dateTo"
            type="date"
            size="sm"
            class="min-w-0 w-full sm:w-36"
            :aria-label="t('logs.dateTo')"
            :disabled="loading"
            @change="applyFilters"
          />
        </div>

        <div class="flex min-w-0 flex-wrap items-center gap-2 xl:justify-end">
          <USelect
            v-if="isAdmin"
            v-model="userFilter"
            :items="userItems"
            value-key="value"
            class="min-w-0 w-full sm:w-32"
            size="sm"
            @update:model-value="applyFilters"
          />
          <USelect
            v-model="actionFilter"
            :items="actionItems"
            value-key="value"
            class="min-w-0 w-[calc(50%-0.25rem)] sm:w-28"
            size="sm"
            @update:model-value="applyFilters"
          />
          <USelect
            v-model="sourceFilter"
            :items="sourceItems"
            value-key="value"
            class="min-w-0 w-[calc(50%-0.25rem)] sm:w-28"
            size="sm"
            @update:model-value="applyFilters"
          />
          <div class="flex min-w-0 w-full items-center gap-2 sm:w-auto">
            <UInput
              v-model="searchQuery"
              icon="i-lucide-search"
              :placeholder="t('logs.searchPlaceholder')"
              class="min-w-0 flex-1 sm:w-44 sm:flex-none"
              size="sm"
              :disabled="loading"
            />
            <UButton
              type="submit"
              size="sm"
              class="shrink-0"
              :loading="loading"
            >
              {{ t('common.search') }}
            </UButton>
            <UButton
              v-if="activeSearch"
              type="button"
              icon="i-lucide-x"
              size="sm"
              variant="ghost"
              color="neutral"
              class="shrink-0"
              :aria-label="t('stats.clear')"
              @click="clearSearch"
            />
          </div>
        </div>
      </div>
    </form>

    <div class="overflow-hidden rounded-xl border border-default bg-default">
      <div
        v-if="loading"
        class="p-4 sm:p-6"
      >
        <div class="space-y-3 sm:hidden">
          <USkeleton
            v-for="n in 6"
            :key="`mobile-${n}`"
            class="h-24 rounded-lg"
          />
        </div>
        <div class="hidden space-y-2 sm:block">
          <USkeleton
            v-for="n in 8"
            :key="`desktop-${n}`"
            class="h-12 rounded-lg"
          />
        </div>
      </div>

      <template v-else-if="listData && listData.items.length">
        <div class="min-w-0 sm:hidden">
          <div class="divide-y divide-default">
            <article
              v-for="row in listData.items"
              :key="row.id"
              class="min-w-0 px-4 py-3.5"
            >
              <div class="flex items-start justify-between gap-3">
                <time class="text-xs text-muted">
                  {{ formatTimeShort(row.createdAt) }}
                </time>
                <span class="shrink-0 text-xs tabular-nums text-muted">
                  {{ formatSize(row.action, row.size) }}
                </span>
              </div>

              <div class="mt-2 flex min-w-0 max-w-full flex-wrap items-center gap-1.5">
                <span :class="actionBadgeClass(row.action)">
                  <UIcon
                    :name="actionIcon(row.action)"
                    class="size-3 shrink-0"
                  />
                  {{ actionLabel(row.action) }}
                </span>
                <span :class="sourceBadgeClass(row.source)">
                  <UIcon
                    :name="sourceIcon(row.source)"
                    class="size-3 shrink-0"
                  />
                  {{ sourceLabel(row.source) }}
                </span>
                <span
                  v-if="isAdmin"
                  class="text-xs text-muted"
                >
                  {{ row.username ?? '—' }}
                </span>
              </div>

              <p
                class="mt-2 truncate text-sm"
                :title="row.originalName"
              >
                {{ row.originalName }}
              </p>

              <div class="mt-2 flex items-center justify-between gap-2 text-xs text-muted">
                <span>{{ formatIp(row.ipAddress) }}</span>
                <span class="inline-flex items-center gap-1.5">
                  <span
                    class="size-1.5 rounded-full"
                    :class="statusDotClass(row.status)"
                  />
                  {{ statusLabel(row.status) }}
                </span>
              </div>
            </article>
          </div>
        </div>

        <div class="hidden min-w-0 overflow-x-auto sm:block">
          <table class="w-full min-w-[56rem] text-left text-sm">
            <thead class="border-b border-default bg-muted/30 text-xs text-muted">
              <tr>
                <th class="whitespace-nowrap px-4 py-3 font-medium sm:px-5">
                  {{ t('logs.colTime') }}
                </th>
                <th
                  v-if="isAdmin"
                  class="whitespace-nowrap px-4 py-3 font-medium"
                >
                  {{ t('logs.colUser') }}
                </th>
                <th class="whitespace-nowrap px-4 py-3 font-medium">
                  {{ t('logs.colAction') }}
                </th>
                <th class="whitespace-nowrap px-4 py-3 font-medium">
                  {{ t('logs.colSource') }}
                </th>
                <th class="px-4 py-3 font-medium">
                  {{ t('logs.colFile') }}
                </th>
                <th class="whitespace-nowrap px-4 py-3 font-medium">
                  {{ t('logs.colSize') }}
                </th>
                <th class="whitespace-nowrap px-4 py-3 font-medium">
                  {{ t('logs.colIp') }}
                </th>
                <th class="whitespace-nowrap px-4 py-3 font-medium sm:px-5">
                  {{ t('logs.colResult') }}
                </th>
              </tr>
            </thead>
            <tbody class="divide-y divide-default">
              <tr
                v-for="row in listData.items"
                :key="row.id"
                class="hover:bg-muted/20"
              >
                <td class="whitespace-nowrap px-4 py-3 text-xs text-muted sm:px-5">
                  {{ formatTime(row.createdAt) }}
                </td>
                <td
                  v-if="isAdmin"
                  class="whitespace-nowrap px-4 py-3 text-xs"
                >
                  {{ row.username ?? '—' }}
                </td>
                <td class="whitespace-nowrap px-4 py-3">
                  <span :class="actionBadgeClass(row.action)">
                    <UIcon
                      :name="actionIcon(row.action)"
                      class="size-3 shrink-0"
                    />
                    {{ actionLabel(row.action) }}
                  </span>
                </td>
                <td class="whitespace-nowrap px-4 py-3">
                  <span :class="sourceBadgeClass(row.source)">
                    <UIcon
                      :name="sourceIcon(row.source)"
                      class="size-3 shrink-0"
                    />
                    {{ sourceLabel(row.source) }}
                  </span>
                </td>
                <td
                  class="max-w-[12rem] truncate px-4 py-3"
                  :title="row.originalName"
                >
                  {{ row.originalName }}
                </td>
                <td class="whitespace-nowrap px-4 py-3 tabular-nums text-muted">
                  {{ formatSize(row.action, row.size) }}
                </td>
                <td class="whitespace-nowrap px-4 py-3 font-mono text-xs text-muted">
                  {{ formatIp(row.ipAddress) }}
                </td>
                <td class="whitespace-nowrap px-4 py-3 sm:px-5">
                  <span class="inline-flex items-center gap-1.5 text-xs">
                    <span
                      class="size-1.5 rounded-full"
                      :class="statusDotClass(row.status)"
                    />
                    {{ statusLabel(row.status) }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </template>

      <div
        v-else
        class="px-4 py-16 text-center text-sm text-muted sm:px-6"
      >
        {{ t('logs.empty') }}
      </div>

      <div
        v-if="listData && listData.total > 0"
        class="border-t border-default px-4 py-4 sm:px-5"
      >
        <PaginationBar
          :page="listData.page"
          :total-pages="listData.totalPages"
          :total="listData.total"
          :unit="t('logs.entriesUnit')"
          :page-size="pageSize"
          :loading="loading"
          @update:page="handlePageChange"
          @update:page-size="handlePageSizeChange"
        />
      </div>
    </div>
  </div>
</template>
