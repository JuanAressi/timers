import { describe, expect, it } from 'vitest'
import { formatDuration } from './format'

describe('formatDuration', () => {
  it('formats zero', () => {
    expect(formatDuration(0)).toBe('0:00:00')
  })

  it('formats hours, minutes and seconds', () => {
    expect(formatDuration((2 * 3600 + 5 * 60 + 9) * 1000)).toBe('2:05:09')
  })

  it('drops milliseconds and clamps negatives', () => {
    expect(formatDuration(1999)).toBe('0:00:01')
    expect(formatDuration(-5000)).toBe('0:00:00')
  })
})
