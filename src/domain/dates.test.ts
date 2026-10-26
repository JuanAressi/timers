import { describe, expect, it } from 'vitest'
import { addLocalDays, getDayRange, getMonthRange, getWeekRange, splitByLocalDay, startOfLocalDay } from './dates'
import { HOUR, local } from './testUtils'

describe('test time zone', () => {
  it('runs in Europe/Madrid (UTC+1 in winter, UTC+2 in summer)', () => {
    expect(new Date(2026, 0, 15).getTimezoneOffset()).toBe(-60)
    expect(new Date(2026, 6, 15).getTimezoneOffset()).toBe(-120)
  })
})

describe('startOfLocalDay', () => {
  it('returns local midnight', () => {
    expect(startOfLocalDay(local(2026, 10, 20, 15, 42))).toBe(local(2026, 10, 20))
    expect(startOfLocalDay(local(2026, 10, 20))).toBe(local(2026, 10, 20))
  })
})

describe('addLocalDays', () => {
  it('lands on local midnight across the spring DST change (23 h day)', () => {
    const next = addLocalDays(local(2026, 3, 29), 1)
    expect(next).toBe(local(2026, 3, 30))
    expect(next - local(2026, 3, 29)).toBe(23 * HOUR)
  })

  it('lands on local midnight across the autumn DST change (25 h day)', () => {
    const next = addLocalDays(local(2026, 10, 25), 1)
    expect(next).toBe(local(2026, 10, 26))
    expect(next - local(2026, 10, 25)).toBe(25 * HOUR)
  })

  it('moves backwards', () => {
    expect(addLocalDays(local(2026, 3, 1), -1)).toBe(local(2026, 2, 28))
  })
})

describe('getDayRange', () => {
  it('covers the whole local day', () => {
    expect(getDayRange(local(2026, 10, 20, 9))).toEqual({ start: local(2026, 10, 20), end: local(2026, 10, 21) })
  })
})

describe('getWeekRange', () => {
  it('starts on the previous Monday for a Sunday', () => {
    expect(getWeekRange(local(2026, 10, 25, 12))).toEqual({ start: local(2026, 10, 19), end: local(2026, 10, 26) })
  })

  it('starts on the same Monday at 00:00', () => {
    expect(getWeekRange(local(2026, 10, 19)).start).toBe(local(2026, 10, 19))
  })

  it('has 7 days plus the extra DST hour in the autumn change week', () => {
    const { start, end } = getWeekRange(local(2026, 10, 21))
    expect(end - start).toBe(7 * 24 * HOUR + HOUR)
  })
})

describe('getMonthRange', () => {
  it('covers the calendar month', () => {
    expect(getMonthRange(local(2026, 2, 14))).toEqual({ start: local(2026, 2, 1), end: local(2026, 3, 1) })
  })

  it('ends on January 1 for December', () => {
    expect(getMonthRange(local(2026, 12, 31, 23))).toEqual({ start: local(2026, 12, 1), end: local(2027, 1, 1) })
  })
})

describe('splitByLocalDay', () => {
  it('keeps an interval within one day whole', () => {
    expect(splitByLocalDay(local(2026, 10, 20, 9), local(2026, 10, 20, 10))).toEqual([
      { start: local(2026, 10, 20, 9), end: local(2026, 10, 20, 10) },
    ])
  })

  it('splits at midnight', () => {
    expect(splitByLocalDay(local(2026, 10, 20, 23, 30), local(2026, 10, 21, 0, 30))).toEqual([
      { start: local(2026, 10, 20, 23, 30), end: local(2026, 10, 21) },
      { start: local(2026, 10, 21), end: local(2026, 10, 21, 0, 30) },
    ])
  })

  it('splits a 3-day interval across the spring DST change', () => {
    const ranges = splitByLocalDay(local(2026, 3, 28, 23), local(2026, 3, 30, 1))
    expect(ranges.map((range) => (range.end - range.start) / HOUR)).toEqual([1, 23, 1])
  })

  it('returns nothing for empty or inverted intervals', () => {
    expect(splitByLocalDay(5, 5)).toEqual([])
    expect(splitByLocalDay(10, 5)).toEqual([])
  })
})
