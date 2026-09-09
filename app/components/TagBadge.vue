<script setup lang="ts">
import type { ImageTag } from '~/types/image'
import { defaultTagColor, resolveTagHexColor, tagPillStyle } from '~/utils/tag-colors'

const props = withDefaults(defineProps<{
  tag: ImageTag
  removable?: boolean
  clickable?: boolean
  size?: 'xs' | 'sm'
}>(), {
  removable: false,
  clickable: false,
  size: 'xs'
})

const emit = defineEmits<{
  remove: []
  click: []
}>()

const displayColor = computed(() =>
  resolveTagHexColor(props.tag.color, defaultTagColor(props.tag.id))
)

const pillStyle = computed(() => tagPillStyle(displayColor.value))
</script>

<template>
  <span
    class="inline-flex max-w-full items-center gap-1 rounded-md border px-2 py-0.5 font-medium"
    :class="[
      size === 'sm' ? 'text-sm' : 'text-xs',
      clickable ? 'cursor-pointer hover:opacity-90' : ''
    ]"
    :style="pillStyle"
    :role="clickable ? 'button' : undefined"
    :tabindex="clickable ? 0 : undefined"
    @click="clickable ? emit('click') : undefined"
    @keydown.enter.prevent="clickable ? emit('click') : undefined"
    @keydown.space.prevent="clickable ? emit('click') : undefined"
  >
    <span
      class="size-1.5 shrink-0 rounded-full"
      :style="{ backgroundColor: displayColor }"
      aria-hidden="true"
    />
    <span class="truncate">{{ tag.name }}</span>
    <button
      v-if="removable"
      type="button"
      class="inline-flex shrink-0 rounded p-0.5 opacity-70 hover:opacity-100"
      :aria-label="`Remove ${tag.name}`"
      @click.stop="emit('remove')"
    >
      <UIcon
        name="i-lucide-x"
        class="size-3"
      />
    </button>
  </span>
</template>
