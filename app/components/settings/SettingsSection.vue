<script setup lang="ts">
defineProps<{
  title: string
  hint?: string
}>()
</script>

<template>
  <section class="overflow-hidden rounded-xl border border-default bg-default">
    <div class="flex items-start justify-between gap-4 px-4 py-3">
      <div class="min-w-0">
        <div class="flex items-center gap-2">
          <span
            class="h-4 w-1 shrink-0 rounded-full bg-primary"
            aria-hidden="true"
          />
          <h2 class="text-sm font-semibold text-highlighted">
            {{ title }}
          </h2>
        </div>
        <p
          v-if="hint"
          class="mt-1.5 pl-3 text-xs leading-relaxed text-muted"
        >
          {{ hint }}
        </p>
      </div>
      <div
        v-if="$slots.action"
        class="shrink-0"
      >
        <slot name="action" />
      </div>
    </div>
    <div class="border-t border-default px-4">
      <slot />
    </div>
  </section>
</template>
