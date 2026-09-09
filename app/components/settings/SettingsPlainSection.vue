<script setup lang="ts">
defineProps<{
  title: string
  hint?: string
}>()
</script>

<template>
  <section class="overflow-hidden rounded-xl border border-default bg-default">
    <div class="px-4 py-3">
      <div class="flex flex-wrap items-center gap-2">
        <h2 class="text-sm font-semibold text-highlighted">
          {{ title }}
        </h2>
        <slot name="badge" />
      </div>
      <p
        v-if="hint"
        class="mt-1 text-xs leading-relaxed text-muted"
      >
        {{ hint }}
      </p>
    </div>
    <div class="border-t border-default px-4 py-4">
      <slot />
    </div>
  </section>
</template>
