import { describe, expect, it } from 'vitest'
import {
  buildTagFilterSql,
  isValidTagColor,
  isValidTagName,
  normalizeTagName,
  parseTagIdsParam
} from './tags'

describe('normalizeTagName', () => {
  it('trims and collapses whitespace', () => {
    expect(normalizeTagName('  工作   截图  ')).toBe('工作 截图')
  })
})

describe('isValidTagName', () => {
  it('accepts 1-32 char names', () => {
    expect(isValidTagName('工作')).toBe(true)
    expect(isValidTagName('a'.repeat(32))).toBe(true)
  })

  it('rejects empty or too long names', () => {
    expect(isValidTagName('')).toBe(false)
    expect(isValidTagName('   ')).toBe(false)
    expect(isValidTagName('a'.repeat(33))).toBe(false)
  })
})

describe('isValidTagColor', () => {
  it('accepts hex colors and empty', () => {
    expect(isValidTagColor('#22c55e')).toBe(true)
    expect(isValidTagColor(null)).toBe(true)
    expect(isValidTagColor('')).toBe(true)
  })

  it('rejects invalid colors', () => {
    expect(isValidTagColor('red')).toBe(false)
    expect(isValidTagColor('#abc')).toBe(false)
  })
})

describe('parseTagIdsParam', () => {
  it('parses comma-separated and array values', () => {
    expect(parseTagIdsParam('1,2,3')).toEqual([1, 2, 3])
    expect(parseTagIdsParam(['4', '5'])).toEqual([4, 5])
  })

  it('deduplicates and skips invalid entries', () => {
    expect(parseTagIdsParam('1,1,abc,0,-1')).toEqual([1])
    expect(parseTagIdsParam('')).toEqual([])
  })
})

describe('buildTagFilterSql', () => {
  it('returns empty sql without filter', () => {
    const params: Array<string | number> = []
    expect(buildTagFilterSql(undefined, params)).toBe('')
    expect(params).toEqual([])
  })

  it('filters untagged images', () => {
    const params: Array<string | number> = []
    const sql = buildTagFilterSql({ untaggedOnly: true }, params)
    expect(sql).toContain('NOT IN')
    expect(params).toEqual([])
  })

  it('filters by tag ids with OR semantics', () => {
    const params: Array<string | number> = []
    const sql = buildTagFilterSql({ tagIds: [2, 5] }, params)
    expect(sql).toContain('tag_id IN')
    expect(params).toEqual([2, 5])
  })

  it('filters by tag ids with AND semantics', () => {
    const params: Array<string | number> = []
    const sql = buildTagFilterSql({ tagIds: [2, 5], tagMode: 'and' }, params)
    expect(sql).toContain('HAVING COUNT(DISTINCT tag_id) = 2')
    expect(params).toEqual([2, 5])
  })
})
