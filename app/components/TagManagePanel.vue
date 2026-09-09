<script setup lang="ts">
import type { ImageTag } from '~/types/image'
import {
  defaultTagColor,
  pickDefaultTagColorFromCandidates,
  pickTagColorCandidates,
  resolveTagHexColor,
  TAG_COLOR_EDIT_CANDIDATE_COUNT
} from '~/utils/tag-colors'

const props = withDefaults(defineProps<{
  tags: ImageTag[]
  embedded?: boolean
}>(), {
  embedded: false
})

const emit = defineEmits<{
  changed: []
  close: []
}>()

const { t, locale } = useI18n()
const toast = useToast()
const { createTag, updateTag, deleteTag, mergeTags } = useTags()

const creating = ref(false)
const newName = ref('')
const newColorCandidates = ref<string[]>(pickTagColorCandidates([]))
const newColor = ref(pickDefaultTagColorFromCandidates(newColorCandidates.value, []))
const search = ref('')
const statusFilter = ref<'all' | 'used' | 'unused'>('all')
const selectedIds = ref<Set<number>>(new Set())
const renamingId = ref<number | null>(null)
const renameValue = ref('')
const colorPickerId = ref<number | null>(null)
const colorValue = ref('#22c55e')
const editColorCandidates = ref<string[]>([])
const mergeOpen = ref(false)
const mergeConfirmOpen = ref(false)
const mergeMode = ref<'batch' | 'single'>('batch')
const mergeSourceIds = ref<number[]>([])
const mergeTargetId = ref<number | null>(null)
const deleteOpen = ref(false)
const deleteTarget = ref<ImageTag | null>(null)
const saving = ref(false)
const page = ref(1)
const pageSize = ref(10)

const stats = computed(() => {
  const now = Date.now()
  const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000
  let used = 0
  let unused = 0
  let newIn7Days = 0
  for (const tag of props.tags) {
    const count = tag.imageCount ?? 0
    if (count > 0) used++
    else unused++
    if (tag.createdAt && new Date(tag.createdAt).getTime() >= sevenDaysAgo) {
      newIn7Days++
    }
  }
  return {
    total: props.tags.length,
    used,
    unused,
    newIn7Days
  }
})

const filteredTags = computed(() => {
  const q = search.value.trim().toLowerCase()
  return props.tags.filter((tag) => {
    if (statusFilter.value === 'used' && (tag.imageCount ?? 0) === 0) return false
    if (statusFilter.value === 'unused' && (tag.imageCount ?? 0) > 0) return false
    if (q && !tag.name.toLowerCase().includes(q)) return false
    return true
  }).sort((a, b) => (b.imageCount ?? 0) - (a.imageCount ?? 0) || a.name.localeCompare(b.name))
})

const totalPages = computed(() => Math.max(1, Math.ceil(filteredTags.value.length / pageSize.value)))

const paginatedTags = computed(() => {
  const start = (page.value - 1) * pageSize.value
  return filteredTags.value.slice(start, start + pageSize.value)
})

watch([search, statusFilter, pageSize], () => {
  page.value = 1
})

watch(filteredTags, (list) => {
  if (page.value > Math.max(1, Math.ceil(list.length / pageSize.value))) {
    page.value = 1
  }
})

const selectedList = computed(() =>
  [...selectedIds.value]
    .map(id => props.tags.find(tag => tag.id === id))
    .filter(Boolean) as ImageTag[]
)

const selectedCount = computed(() => selectedIds.value.size)

const allPageSelected = computed(() =>
  paginatedTags.value.length > 0
  && paginatedTags.value.every(tag => selectedIds.value.has(tag.id))
)

const mergeSourceTags = computed(() =>
  mergeSourceIds.value
    .map(id => props.tags.find(tag => tag.id === id))
    .filter(Boolean) as ImageTag[]
)

const mergeTargetCandidates = computed(() => {
  const sourceSet = new Set(mergeSourceIds.value)
  return props.tags
    .filter(tag => !sourceSet.has(tag.id))
    .sort((a, b) => (b.imageCount ?? 0) - (a.imageCount ?? 0) || a.name.localeCompare(b.name))
})

const mergeTagsToDelete = computed(() => {
  if (!mergeTargetId.value) return []
  return mergeSourceTags.value.filter(tag => tag.id !== mergeTargetId.value)
})

const mergeKeepTag = computed(() =>
  props.tags.find(tag => tag.id === mergeTargetId.value) ?? null
)

const statusItems = computed(() => [
  { label: t('tags.filterStatusAll'), value: 'all' },
  { label: t('tags.filterStatusUsed'), value: 'used' },
  { label: t('tags.filterStatusUnused'), value: 'unused' }
])

const statValueClass = computed(() =>
  'mt-2 text-2xl font-semibold tabular-nums text-highlighted'
)

const tableTextClass = computed(() => 'text-sm')

function formatLastUsed(tag: ImageTag) {
  if (!tag.lastUsedAt || (tag.imageCount ?? 0) === 0) {
    return t('tags.neverUsed')
  }
  const date = new Date(tag.lastUsedAt)
  if (Number.isNaN(date.getTime())) {
    return t('tags.neverUsed')
  }
  return date.toLocaleString(locale.value, {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  })
}

function toggleSelect(id: number) {
  const next = new Set(selectedIds.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  selectedIds.value = next
}

function toggleSelectAll() {
  const next = new Set(selectedIds.value)
  if (allPageSelected.value) {
    for (const tag of paginatedTags.value) next.delete(tag.id)
  } else {
    for (const tag of paginatedTags.value) next.add(tag.id)
  }
  selectedIds.value = next
}

function clearSelection() {
  selectedIds.value = new Set()
}

function usedColorsExcept(tagId?: number) {
  return props.tags
    .filter(tag => tagId === undefined || tag.id !== tagId)
    .map(tag => tag.color)
}

function refreshNewTagColor() {
  const used = usedColorsExcept()
  newColorCandidates.value = pickTagColorCandidates(used)
  newColor.value = pickDefaultTagColorFromCandidates(newColorCandidates.value, used)
}

function toggleCreating() {
  if (creating.value) {
    creating.value = false
    return
  }
  newName.value = ''
  refreshNewTagColor()
  creating.value = true
}

async function handleCreate() {
  const name = newName.value.trim()
  if (!name || saving.value) return
  saving.value = true
  try {
    await createTag(name, newColor.value)
    newName.value = ''
    creating.value = false
    refreshNewTagColor()
    emit('changed')
    toast.add({ title: t('tags.created', { name }), color: 'success' })
  } catch {
    toast.add({ title: t('tags.createFailed'), color: 'error' })
  } finally {
    saving.value = false
  }
}

function startRename(tag: ImageTag) {
  if (renamingId.value !== null && renamingId.value !== tag.id) {
    cancelRename()
  }
  renamingId.value = tag.id
  renameValue.value = tag.name
}

function cancelRename() {
  renamingId.value = null
  renameValue.value = ''
}

function onRenameBlur(tagId: number) {
  window.setTimeout(() => {
    if (renamingId.value === tagId) {
      void finishRename(tagId)
    }
  }, 0)
}

async function finishRename(tagId: number) {
  if (renamingId.value !== tagId) return

  const name = renameValue.value.trim()
  const tag = props.tags.find(item => item.id === tagId)
  renamingId.value = null
  renameValue.value = ''

  if (!name || !tag || tag.name === name) return

  saving.value = true
  try {
    await updateTag(tagId, { name })
    emit('changed')
    toast.add({ title: t('tags.renamed'), color: 'success' })
  } catch {
    toast.add({ title: t('tags.renameFailed'), color: 'error' })
  } finally {
    saving.value = false
  }
}

function openColorPicker(tag: ImageTag) {
  colorPickerId.value = tag.id
  colorValue.value = resolveTagHexColor(tag.color, defaultTagColor(tag.id))
  editColorCandidates.value = pickTagColorCandidates(
    usedColorsExcept(tag.id),
    TAG_COLOR_EDIT_CANDIDATE_COUNT
  )
}

async function saveColor(tagId: number) {
  saving.value = true
  try {
    await updateTag(tagId, { color: colorValue.value })
    colorPickerId.value = null
    emit('changed')
  } catch {
    toast.add({ title: t('tags.colorFailed'), color: 'error' })
  } finally {
    saving.value = false
  }
}

function openDeleteConfirm(tag: ImageTag) {
  deleteTarget.value = tag
  deleteOpen.value = true
}

async function confirmDelete() {
  const tag = deleteTarget.value
  if (!tag || saving.value) return
  saving.value = true
  try {
    await deleteTag(tag.id)
    deleteOpen.value = false
    deleteTarget.value = null
    selectedIds.value.delete(tag.id)
    selectedIds.value = new Set(selectedIds.value)
    emit('changed')
    toast.add({ title: t('tags.deleted', { name: tag.name }), color: 'success' })
  } catch {
    toast.add({ title: t('tags.deleteFailed'), color: 'error' })
  } finally {
    saving.value = false
  }
}

function openBatchMerge() {
  if (selectedIds.value.size < 2) {
    toast.add({ title: t('tags.mergeSelectAtLeast'), color: 'warning' })
    return
  }
  mergeMode.value = 'batch'
  mergeSourceIds.value = [...selectedIds.value]
  const sorted = selectedList.value.sort((a, b) => (b.imageCount ?? 0) - (a.imageCount ?? 0))
  mergeTargetId.value = sorted[0]?.id ?? null
  mergeOpen.value = true
}

function openSingleMerge(tag: ImageTag) {
  mergeMode.value = 'single'
  mergeSourceIds.value = [tag.id]
  const fallback = props.tags
    .filter(item => item.id !== tag.id)
    .sort((a, b) => (b.imageCount ?? 0) - (a.imageCount ?? 0))[0]
  mergeTargetId.value = fallback?.id ?? null
  mergeOpen.value = true
}

function requestMergeConfirm() {
  if (!mergeTargetId.value) return
  const sourceIds = mergeSourceIds.value.filter(id => id !== mergeTargetId.value)
  if (!sourceIds.length) return
  mergeConfirmOpen.value = true
}

async function confirmMerge() {
  if (!mergeTargetId.value || saving.value) return
  const sourceIds = mergeSourceIds.value.filter(id => id !== mergeTargetId.value)
  if (!sourceIds.length) return
  saving.value = true
  try {
    await mergeTags(sourceIds, mergeTargetId.value)
    selectedIds.value = new Set()
    mergeConfirmOpen.value = false
    mergeOpen.value = false
    emit('changed')
    toast.add({ title: t('tags.merged'), color: 'success' })
  } catch {
    toast.add({ title: t('tags.mergeFailed'), color: 'error' })
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="space-y-5">
    <div class="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <div class="rounded-xl border border-default bg-elevated p-4">
        <div class="flex items-center gap-2 text-xs text-muted">
          <span class="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <UIcon
              name="i-lucide-tags"
              class="size-4"
            />
          </span>
          {{ t('tags.statTotal') }}
        </div>
        <p :class="statValueClass">
          {{ stats.total }}
        </p>
      </div>
      <div class="rounded-xl border border-default bg-elevated p-4">
        <div class="flex items-center gap-2 text-xs text-muted">
          <span class="flex size-7 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
            <UIcon
              name="i-lucide-image"
              class="size-4"
            />
          </span>
          {{ t('tags.statUsed') }}
        </div>
        <p :class="statValueClass">
          {{ stats.used }}
        </p>
      </div>
      <div class="rounded-xl border border-default bg-elevated p-4">
        <div class="flex items-center gap-2 text-xs text-muted">
          <span class="flex size-7 items-center justify-center rounded-lg bg-orange-500/10 text-orange-600 dark:text-orange-400">
            <UIcon
              name="i-lucide-tag"
              class="size-4"
            />
          </span>
          {{ t('tags.statUnused') }}
        </div>
        <p :class="statValueClass">
          {{ stats.unused }}
        </p>
      </div>
      <div class="rounded-xl border border-default bg-elevated p-4">
        <div class="flex items-center gap-2 text-xs text-muted">
          <span class="flex size-7 items-center justify-center rounded-lg bg-violet-500/10 text-violet-600 dark:text-violet-400">
            <UIcon
              name="i-lucide-trending-up"
              class="size-4"
            />
          </span>
          {{ t('tags.statNew7d') }}
        </div>
        <p :class="statValueClass">
          {{ stats.newIn7Days }}
        </p>
      </div>
    </div>

    <div class="flex flex-wrap items-center gap-2">
      <UInput
        v-model="search"
        size="sm"
        icon="i-lucide-search"
        :placeholder="t('tags.searchName')"
        class="min-w-44 flex-1 sm:max-w-xs"
      />
      <USelect
        v-model="statusFilter"
        size="sm"
        :items="statusItems"
        class="w-32"
      />
      <div class="ml-auto flex flex-wrap gap-2">
        <UButton
          type="button"
          size="sm"
          color="primary"
          icon="i-lucide-plus"
          @click="toggleCreating"
        >
          {{ t('tags.addTag') }}
        </UButton>
        <UButton
          type="button"
          size="sm"
          variant="outline"
          color="neutral"
          icon="i-lucide-merge"
          :disabled="selectedCount < 2"
          @click="openBatchMerge"
        >
          {{ t('tags.mergeTags') }}
        </UButton>
      </div>
    </div>

    <div
      v-if="selectedCount > 0"
      class="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-primary/25 bg-primary/5 px-3 py-2"
    >
      <span class="text-xs font-medium text-highlighted">
        {{ t('tags.mergeSelected', { n: selectedCount }) }}
      </span>
      <UButton
        size="xs"
        variant="ghost"
        color="neutral"
        @click="clearSelection"
      >
        {{ t('tags.mergeClear') }}
      </UButton>
    </div>

    <div
      v-if="creating"
      class="space-y-4 rounded-xl border border-default bg-elevated/50 p-4"
    >
      <div class="flex flex-wrap items-start gap-3">
        <div class="min-w-0 flex-1 space-y-3">
          <UInput
            v-model="newName"
            size="md"
            :placeholder="t('tags.namePlaceholder')"
            @keydown.enter.prevent="handleCreate"
          />
          <TagColorPicker
            v-model="newColor"
            :candidates="newColorCandidates"
          />
        </div>
        <div
          v-if="newName.trim()"
          class="shrink-0 pt-1"
        >
          <p class="mb-1.5 text-xs text-muted">
            {{ t('tags.preview') }}
          </p>
          <TagBadge
            :tag="{ id: 0, name: newName.trim(), color: newColor }"
          />
        </div>
      </div>
      <div class="flex justify-end gap-2 border-t border-default pt-3">
        <UButton
          size="sm"
          variant="ghost"
          color="neutral"
          @click="() => { creating = false }"
        >
          {{ t('common.cancel') }}
        </UButton>
        <UButton
          size="sm"
          color="primary"
          :loading="saving"
          :disabled="!newName.trim()"
          @click="handleCreate"
        >
          {{ t('common.save') }}
        </UButton>
      </div>
    </div>

    <div class="overflow-hidden rounded-xl border border-default">
      <div class="overflow-x-auto">
        <table
          class="min-w-full"
          :class="tableTextClass"
        >
          <thead class="border-b border-default bg-elevated/60 text-xs text-muted">
            <tr>
              <th class="w-10 px-3 py-3">
                <UCheckbox
                  :model-value="allPageSelected"
                  :disabled="!paginatedTags.length"
                  @update:model-value="toggleSelectAll"
                />
              </th>
              <th class="px-3 py-3 text-left font-medium">
                {{ t('tags.colName') }}
              </th>
              <th class="px-3 py-3 text-left font-medium">
                {{ t('tags.colImageCount') }}
              </th>
              <th class="px-3 py-3 text-left font-medium">
                {{ t('tags.colLastUsed') }}
              </th>
              <th class="px-3 py-3 text-right font-medium">
                {{ t('tags.colActions') }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="tag in paginatedTags"
              :key="tag.id"
              class="border-b border-default last:border-b-0"
              :class="selectedIds.has(tag.id) ? 'bg-primary/5' : 'hover:bg-elevated/40'"
            >
              <td class="px-3 py-3 align-middle">
                <UCheckbox
                  :model-value="selectedIds.has(tag.id)"
                  @update:model-value="toggleSelect(tag.id)"
                />
              </td>
              <td class="px-3 py-3 align-middle">
                <UInput
                  v-if="renamingId === tag.id"
                  v-model="renameValue"
                  size="sm"
                  class="max-w-xs"
                  autofocus
                  @keydown.enter.prevent="finishRename(tag.id)"
                  @keydown.esc.prevent="cancelRename"
                  @blur="onRenameBlur(tag.id)"
                />
                <TagBadge
                  v-else
                  :tag="tag"
                  size="sm"
                />
              </td>
              <td class="px-3 py-3 align-middle tabular-nums text-muted">
                {{ tag.imageCount ?? 0 }}
              </td>
              <td class="px-3 py-3 align-middle text-muted">
                {{ formatLastUsed(tag) }}
              </td>
              <td class="px-3 py-3 align-middle">
                <div class="flex items-center justify-end gap-0.5">
                  <UButton
                    type="button"
                    size="xs"
                    variant="ghost"
                    color="primary"
                    icon="i-lucide-pencil"
                    :aria-label="t('common.edit')"
                    @click="startRename(tag)"
                  />
                  <UPopover
                    :open="colorPickerId === tag.id"
                    :content="{ side: 'bottom', align: 'end' }"
                    @update:open="(open) => { colorPickerId = open ? tag.id : null }"
                  >
                    <UButton
                      type="button"
                      size="xs"
                      variant="ghost"
                      color="primary"
                      icon="i-lucide-palette"
                      :aria-label="t('tags.pickColor')"
                      @click="() => openColorPicker(tag)"
                    />
                    <template #content>
                      <div
                        class="flex items-center gap-2 p-2"
                        @click.stop
                      >
                        <TagColorPicker
                          v-model="colorValue"
                          :candidates="editColorCandidates"
                          compact
                        />
                        <UButton
                          icon="i-lucide-check"
                          size="sm"
                          color="primary"
                          class="shrink-0"
                          :aria-label="t('common.save')"
                          :loading="saving"
                          @click="saveColor(tag.id)"
                        />
                      </div>
                    </template>
                  </UPopover>
                  <UButton
                    type="button"
                    size="xs"
                    variant="ghost"
                    color="primary"
                    icon="i-lucide-merge"
                    :aria-label="t('tags.mergeIntoAction')"
                    :disabled="tags.length < 2"
                    @click="openSingleMerge(tag)"
                  />
                  <UButton
                    type="button"
                    size="xs"
                    variant="ghost"
                    color="error"
                    icon="i-lucide-trash-2"
                    :aria-label="t('common.delete')"
                    @click="openDeleteConfirm(tag)"
                  />
                </div>
              </td>
            </tr>
            <tr v-if="!paginatedTags.length">
              <td
                colspan="5"
                class="px-3 py-12 text-center text-sm text-muted"
              >
                {{ tags.length ? t('tags.noMatch') : t('tags.emptyHint') }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <PaginationBar
      v-if="filteredTags.length > 0"
      :page="page"
      :total-pages="totalPages"
      :total="filteredTags.length"
      :page-size="pageSize"
      :page-size-options="[10, 20, 30, 50]"
      @update:page="(value) => { page = value }"
      @update:page-size="(value) => { pageSize = value }"
    />

    <UModal
      v-model:open="mergeOpen"
      :title="mergeMode === 'single' ? t('tags.mergeIntoTitle') : t('tags.mergeTitle')"
      :description="mergeMode === 'single'
        ? t('tags.mergeIntoSubtitle', { name: mergeSourceTags[0]?.name ?? '' })
        : t('tags.mergeSubtitle')"
    >
      <template #body>
        <template v-if="mergeMode === 'batch'">
          <p class="mb-2 text-sm text-muted">
            {{ t('tags.mergeChooseTarget') }}
          </p>
          <div class="merge-tag-list max-h-[16.5rem] space-y-2 overflow-y-auto">
            <label
              v-for="tag in mergeSourceTags"
              :key="tag.id"
              class="flex cursor-pointer items-center gap-3 rounded-lg border border-default px-3 py-2.5 transition-colors"
              :class="mergeTargetId === tag.id ? 'border-primary/40 bg-primary/5' : 'hover:bg-elevated'"
            >
              <input
                v-model="mergeTargetId"
                type="radio"
                :value="tag.id"
                class="accent-primary"
              >
              <TagBadge :tag="tag" />
              <span class="ml-auto text-sm text-muted">
                {{ t('common.countImages', { count: tag.imageCount ?? 0 }) }}
              </span>
            </label>
          </div>
        </template>

        <template v-else>
          <p class="mb-2 text-sm text-muted">
            {{ t('tags.mergeIntoChoose') }}
          </p>
          <div class="merge-tag-list max-h-[16.5rem] space-y-2 overflow-y-auto">
            <label
              v-for="tag in mergeTargetCandidates"
              :key="tag.id"
              class="flex cursor-pointer items-center gap-3 rounded-lg border border-default px-3 py-2.5 transition-colors"
              :class="mergeTargetId === tag.id ? 'border-primary/40 bg-primary/5' : 'hover:bg-elevated'"
            >
              <input
                v-model="mergeTargetId"
                type="radio"
                :value="tag.id"
                class="accent-primary"
              >
              <TagBadge :tag="tag" />
              <span class="ml-auto text-sm text-muted">
                {{ t('common.countImages', { count: tag.imageCount ?? 0 }) }}
              </span>
            </label>
          </div>
        </template>
      </template>

      <template #footer>
        <div class="flex w-full justify-end gap-2">
          <UButton
            variant="outline"
            color="neutral"
            @click="() => { mergeOpen = false }"
          >
            {{ t('common.cancel') }}
          </UButton>
          <UButton
            color="primary"
            icon="i-lucide-merge"
            :disabled="!mergeTargetId"
            @click="requestMergeConfirm"
          >
            {{ t('tags.mergeConfirm') }}
          </UButton>
        </div>
      </template>
    </UModal>

    <UModal
      v-model:open="mergeConfirmOpen"
      :title="t('tags.mergeIrreversibleTitle')"
      :description="t('tags.mergeIrreversible')"
    >
      <template #body>
        <div class="space-y-3 text-sm">
          <p v-if="mergeKeepTag">
            {{ t('tags.mergeConfirmKeep', { name: mergeKeepTag.name }) }}
          </p>
          <p v-if="mergeTagsToDelete.length">
            {{ t('tags.mergeWillDelete', {
              names: mergeTagsToDelete.map(tag => tag.name).join('、')
            }) }}
          </p>
        </div>
      </template>

      <template #footer>
        <div class="flex w-full justify-end gap-2">
          <UButton
            variant="outline"
            color="neutral"
            @click="() => { mergeConfirmOpen = false }"
          >
            {{ t('common.cancel') }}
          </UButton>
          <UButton
            color="primary"
            icon="i-lucide-merge"
            :loading="saving"
            @click="confirmMerge"
          >
            {{ t('tags.mergeConfirm') }}
          </UButton>
        </div>
      </template>
    </UModal>

    <UModal
      v-model:open="deleteOpen"
      :title="t('tags.deleteConfirmTitle')"
      :description="deleteTarget ? t('tags.deleteConfirmDesc', { name: deleteTarget.name }) : ''"
    >
      <template #footer>
        <div class="flex w-full justify-end gap-2">
          <UButton
            variant="outline"
            color="neutral"
            @click="() => { deleteOpen = false }"
          >
            {{ t('common.cancel') }}
          </UButton>
          <UButton
            color="error"
            icon="i-lucide-trash-2"
            :loading="saving"
            @click="confirmDelete"
          >
            {{ t('common.delete') }}
          </UButton>
        </div>
      </template>
    </UModal>
  </div>
</template>

<style scoped>
.merge-tag-list {
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.merge-tag-list::-webkit-scrollbar {
  display: none;
}
</style>
