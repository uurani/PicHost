<script setup lang="ts">
const props = defineProps<{
  message: string
  progress: number
  total: number
}>()

const percent = computed(() => {
  if (!props.total) return 0
  return Math.min(100, Math.round((props.progress / props.total) * 100))
})
</script>

<template>
  <div class="space-y-1.5">
    <div class="flex items-center justify-between gap-2 text-xs text-muted">
      <span class="truncate">{{ message }}</span>
      <span
        v-if="total > 0"
        class="shrink-0 tabular-nums"
      >
        {{ progress }} / {{ total }}
      </span>
    </div>
    <div class="h-1 overflow-hidden rounded-full bg-muted">
      <div
        class="h-full rounded-full bg-primary transition-all duration-300"
        :style="{ width: `${percent}%` }"
      />
    </div>
  </div>
</template>
