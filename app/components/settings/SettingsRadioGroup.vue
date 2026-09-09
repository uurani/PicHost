<script setup lang="ts">
export type SettingsRadioOption = {
  value: string
  label: string
  description?: string
}

defineProps<{
  items: SettingsRadioOption[]
}>()

const model = defineModel<string>({ required: true })

const radioUi = {
  fieldset: 'flex flex-col divide-y divide-default',
  item: 'flex items-start gap-4 py-4',
  wrapper: 'min-w-0 flex-1 pr-2',
  base: 'mt-0.5 shrink-0',
  label: 'block text-sm font-medium text-highlighted',
  description: 'mt-1 block text-xs leading-relaxed text-muted'
}
</script>

<template>
  <URadioGroup
    v-model="model"
    :items="items"
    variant="list"
    :ui="radioUi"
  >
    <template #label="{ item }">
      <span class="text-sm font-medium text-highlighted">{{ item.label }}</span>
    </template>
    <template #description="{ item }">
      <span
        v-if="item.description"
        class="mt-1 block text-xs leading-relaxed text-muted"
      >{{ item.description }}</span>
    </template>
  </URadioGroup>
</template>
