<script setup lang="ts">
defineProps<{
  icon: string
  title: string
  subtitle?: string
}>()
</script>

<template>
  <header class="mb-0 flex items-start gap-3 border-b border-default pb-6">
    <div class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
      <UIcon
        :name="icon"
        class="size-5 text-primary"
      />
    </div>
    <div class="min-w-0 pt-0.5">
      <h1 class="text-lg font-semibold tracking-tight text-highlighted">
        {{ title }}
      </h1>
      <p
        v-if="subtitle"
        class="mt-1 text-xs leading-relaxed text-muted"
      >
        {{ subtitle }}
      </p>
    </div>
  </header>
</template>
