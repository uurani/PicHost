<script setup lang="ts">
import type { SettingsTab } from '~/types/settings'

const props = defineProps<{
  modelValue: SettingsTab
  items: Array<{ id: SettingsTab, label: string, icon: string }>
}>()

const emit = defineEmits<{
  'update:modelValue': [SettingsTab]
}>()

const { t } = useI18n()
const searchQuery = ref('')

const filteredItems = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return props.items
  return props.items.filter(item => item.label.toLowerCase().includes(q))
})

function selectTab(id: SettingsTab) {
  emit('update:modelValue', id)
  searchQuery.value = ''
}
</script>

<template>
  <aside class="flex w-full shrink-0 flex-col border-b border-default bg-neutral-50 dark:bg-neutral-900/30 lg:w-56 lg:border-b-0 lg:border-r xl:w-60">
    <div class="border-b border-default p-3">
      <UInput
        v-model="searchQuery"
        size="sm"
        :placeholder="t('settings.searchPlaceholder')"
        icon="i-lucide-search"
        class="w-full"
      >
        <template #trailing>
          <UKbd
            size="sm"
            class="hidden sm:inline-flex"
          >
            ⌘K
          </UKbd>
        </template>
      </UInput>
    </div>

    <nav class="flex-1 space-y-0.5 p-3">
      <p
        v-if="searchQuery.trim() && !filteredItems.length"
        class="px-3 py-6 text-center text-xs text-muted"
      >
        {{ t('settings.searchEmpty') }}
      </p>
      <button
        v-for="item in filteredItems"
        :key="item.id"
        type="button"
        class="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm transition-colors"
        :class="modelValue === item.id
          ? 'bg-primary/10 font-medium text-primary'
          : 'text-muted hover:bg-muted/50 hover:text-highlighted'"
        @click="selectTab(item.id)"
      >
        <UIcon
          :name="item.icon"
          class="size-4 shrink-0"
          :class="modelValue === item.id ? 'text-primary' : 'opacity-70'"
        />
        <span>{{ item.label }}</span>
      </button>
    </nav>
  </aside>
</template>
