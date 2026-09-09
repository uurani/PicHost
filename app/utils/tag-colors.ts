export const TAG_COLOR_PRESETS = [
  '#22c55e',
  '#3b82f6',
  '#f59e0b',
  '#ef4444',
  '#8b5cf6',
  '#06b6d4',
  '#ec4899',
  '#84cc16',
  '#f97316',
  '#6366f1',
  '#14b8a6',
  '#64748b'
] as const

export const TAG_COLOR_CANDIDATE_COUNT = 8
export const TAG_COLOR_EDIT_CANDIDATE_COUNT = 3

export function defaultTagColor(tagId: number): string {
  return TAG_COLOR_PRESETS[tagId % TAG_COLOR_PRESETS.length]!
}

function normalizeHexColor(color: string | null | undefined): string | null {
  if (!color) return null
  const trimmed = color.trim().toLowerCase()
  if (!trimmed) return null
  const withHash = trimmed.startsWith('#') ? trimmed : `#${trimmed}`
  return /^#[0-9a-f]{6}$/.test(withHash) ? withHash : null
}

/** 解析标签展示色，无效时回退到默认色 */
export function resolveTagHexColor(
  color: string | null | undefined,
  fallback?: string
): string {
  return normalizeHexColor(color) ?? fallback ?? TAG_COLOR_PRESETS[0]!
}

export function usedPresetColorSet(usedColors: (string | null | undefined)[]): Set<string> {
  const used = new Set<string>()
  for (const color of usedColors) {
    const normalized = normalizeHexColor(color)
    if (!normalized) continue
    if (TAG_COLOR_PRESETS.some(preset => preset.toLowerCase() === normalized)) {
      used.add(normalized)
    }
  }
  return used
}

function shuffleColors<T extends string>(colors: readonly T[]): T[] {
  const items = [...colors]
  for (let index = items.length - 1; index > 0; index--) {
    const swapIndex = Math.floor(Math.random() * (index + 1))
    const current = items[index]!
    items[index] = items[swapIndex]!
    items[swapIndex] = current
  }
  return items
}

/**
 * 新增标签时的备选色：优先从未占用预设中随机取满 count 个；
 * 不足时用其余预设随机补足（保证始终有 7～8 个可选项）。
 */
export function pickTagColorCandidates(
  usedColors: (string | null | undefined)[],
  count = TAG_COLOR_CANDIDATE_COUNT
): string[] {
  const used = usedPresetColorSet(usedColors)
  const unused = shuffleColors(TAG_COLOR_PRESETS.filter(preset => !used.has(preset.toLowerCase())))
  const usedPresets = shuffleColors(TAG_COLOR_PRESETS.filter(preset => used.has(preset.toLowerCase())))

  const candidates: string[] = []
  for (const color of unused) {
    if (candidates.length >= count) break
    candidates.push(color.toLowerCase())
  }
  for (const color of usedPresets) {
    if (candidates.length >= count) break
    candidates.push(color.toLowerCase())
  }

  return candidates.length > 0 ? candidates : shuffleColors(TAG_COLOR_PRESETS).slice(0, count).map(c => c.toLowerCase())
}

/** 从备选色中优先选未占用色作为默认；若均已占用则随机选一 */
export function pickDefaultTagColorFromCandidates(
  candidates: string[],
  usedColors: (string | null | undefined)[]
): string {
  if (!candidates.length) {
    return pickRandomUnusedTagColor(usedColors)
  }
  const used = usedPresetColorSet(usedColors)
  const unused = candidates.filter(color => !used.has(color.toLowerCase()))
  const pool = unused.length > 0 ? unused : candidates
  return pool[Math.floor(Math.random() * pool.length)]!.toLowerCase()
}

/** 从未被占用的预设色中随机取一色；若预设色均已占用则退回全量随机 */
export function pickRandomUnusedTagColor(usedColors: (string | null | undefined)[]): string {
  const used = usedPresetColorSet(usedColors)
  const available = TAG_COLOR_PRESETS.filter(preset => !used.has(preset.toLowerCase()))
  const pool = available.length > 0 ? available : TAG_COLOR_PRESETS
  return pool[Math.floor(Math.random() * pool.length)]!.toLowerCase()
}

/** 颜色选择器展示的预设：排除已被其他标签占用的颜色，但保留当前选中色 */
export function visibleTagColorPresets(
  usedColors: (string | null | undefined)[],
  currentColor?: string | null
): readonly string[] {
  const used = usedPresetColorSet(usedColors)
  const current = normalizeHexColor(currentColor)
  return TAG_COLOR_PRESETS.filter((preset) => {
    const lower = preset.toLowerCase()
    return !used.has(lower) || lower === current
  })
}

export function tagPillStyle(color: string | null | undefined, selected = false, fallback?: string) {
  const hex = resolveTagHexColor(color, fallback)
  if (selected) {
    return {
      backgroundColor: hex,
      borderColor: hex,
      color: '#ffffff'
    }
  }
  return {
    borderColor: `${hex}55`,
    backgroundColor: `${hex}18`,
    color: hex
  }
}
