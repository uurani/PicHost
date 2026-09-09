<script setup lang="ts">
import { TAG_COLOR_PRESETS, visibleTagColorPresets } from '~/utils/tag-colors'

const props = withDefaults(defineProps<{
  modelValue: string
  /** 已被其他标签占用的预设色，选择器中优先展示未占用颜色 */
  usedColors?: (string | null | undefined)[]
  /** 固定展示的备选色（新增 8 个 / 编辑 3 个） */
  candidates?: string[]
  /** 紧凑模式：不显示标题 */
  compact?: boolean
}>(), {
  compact: false
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const { t } = useI18n()

const colorInput = ref<HTMLInputElement | null>(null)

const normalizedValue = computed(() => normalizeHex(props.modelValue))

const presetColors = computed(() => {
  if (props.candidates?.length) {
    const seen = new Set<string>()
    const items: string[] = []
    for (const color of props.candidates) {
      const lower = color.toLowerCase()
      if (!seen.has(lower)) {
        seen.add(lower)
        items.push(lower)
      }
    }
    return items
  }
  if (!props.usedColors?.length) return TAG_COLOR_PRESETS
  return visibleTagColorPresets(props.usedColors, props.modelValue)
})

const isPreset = computed(() =>
  TAG_COLOR_PRESETS.some(color => color.toLowerCase() === normalizedValue.value.toLowerCase())
)

const isCustomSelected = computed(() => {
  if (props.candidates?.length) {
    return !presetColors.value.includes(normalizedValue.value)
  }
  return !isPreset.value
})

function normalizeHex(value: string) {
  const trimmed = value.trim()
  if (/^#[0-9A-Fa-f]{6}$/.test(trimmed)) return trimmed.toLowerCase()
  return '#22c55e'
}

function selectColor(color: string) {
  emit('update:modelValue', color.toLowerCase())
}

function onNativeColorInput(event: Event) {
  const value = (event.target as HTMLInputElement).value
  if (value) emit('update:modelValue', value.toLowerCase())
}

function openNativePicker() {
  colorInput.value?.click()
}
</script>

<template>
  <div :class="compact ? '' : 'space-y-2'">
    <p
      v-if="!compact"
      class="text-xs font-medium text-muted"
    >
      {{ t('tags.pickColor') }}
    </p>
    <div class="flex flex-wrap items-center gap-2">
      <button
        v-for="color in presetColors"
        :key="color"
        type="button"
        class="size-7 shrink-0 rounded-full border-2 transition-all hover:scale-110"
        :class="normalizedValue === color
          ? 'border-highlighted ring-2 ring-primary/25 scale-110'
          : 'border-transparent'"
        :style="{ backgroundColor: color }"
        :aria-label="color"
        :title="color"
        @click="selectColor(color)"
      />

      <button
        type="button"
        class="relative size-7 shrink-0 overflow-hidden rounded-full border-2 transition-all hover:scale-110"
        :class="isCustomSelected
          ? 'border-highlighted ring-2 ring-primary/25 scale-110'
          : 'border-dashed border-default'"
        :style="isCustomSelected ? { backgroundColor: normalizedValue } : undefined"
        :aria-label="t('tags.customColor')"
        :title="t('tags.customColor')"
        @click="openNativePicker"
      >
        <span
          v-if="!isCustomSelected"
          class="flex size-full items-center justify-center bg-muted/40"
        >
          <UIcon
            name="i-lucide-pipette"
            class="size-3.5 text-muted"
          />
        </span>
        <input
          ref="colorInput"
          type="color"
          class="pointer-events-none absolute inset-0 size-full opacity-0"
          :value="normalizedValue"
          @input="onNativeColorInput"
        >
      </button>
    </div>
  </div>
</template>
