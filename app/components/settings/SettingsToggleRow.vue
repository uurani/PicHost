<script setup lang="ts">
defineProps<{
  title?: string
  hint?: string
  disabled?: boolean
}>()

const model = defineModel<boolean>({ required: true })
</script>

<template>
  <div class="flex items-start justify-between gap-4 py-4">
    <div class="min-w-0 flex-1 pr-2">
      <p class="text-sm font-medium text-highlighted">
        <slot name="title">
          {{ title }}
        </slot>
      </p>
      <p
        v-if="hint || $slots.hint"
        class="mt-1 text-xs leading-relaxed text-muted"
      >
        <slot name="hint">
          {{ hint }}
        </slot>
      </p>
    </div>
    <USwitch
      v-model="model"
      :disabled="disabled"
      class="mt-0.5 shrink-0"
    />
  </div>
</template>
