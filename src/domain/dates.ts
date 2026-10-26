import type { TimeRange } from './types'

/** Local midnight of the day that contains `ms`. */
export function startOfLocalDay(ms: number): number {
  const date = new Date(ms)
  date.setHours(0, 0, 0, 0)
  return date.getTime()
}

/**
 * Moves `ms` by `days` calendar days, keeping the local wall-clock time.
 * Uses the calendar instead of adding 24 h, so days of 23 or 25 h (DST) stay correct.
 */
export function addLocalDays(ms: number, days: number): number {
  const date = new Date(ms)
  date.setDate(date.getDate() + days)
  return date.getTime()
}

export function getDayRange(now: number): TimeRange {
  const start = startOfLocalDay(now)
  return { start, end: addLocalDays(start, 1) }
}

/** Monday 00:00 to the next Monday 00:00, in local time. */
export function getWeekRange(now: number): TimeRange {
  const today = startOfLocalDay(now)
  const daysSinceMonday = (new Date(today).getDay() + 6) % 7
  const start = addLocalDays(today, -daysSinceMonday)
  return { start, end: addLocalDays(start, 7) }
}

export function getMonthRange(now: number): TimeRange {
  const date = new Date(now)
  const year = date.getFullYear()
  const month = date.getMonth()
  return { start: new Date(year, month, 1).getTime(), end: new Date(year, month + 1, 1).getTime() }
}

/** Splits `[start, end)` at every local midnight. Returns `[]` for empty or inverted intervals. */
export function splitByLocalDay(start: number, end: number): TimeRange[] {
  const ranges: TimeRange[] = []
  let cursor = start
  while (cursor < end) {
    const dayEnd = addLocalDays(startOfLocalDay(cursor), 1)
    const segmentEnd = Math.min(dayEnd, end)
    ranges.push({ start: cursor, end: segmentEnd })
    cursor = segmentEnd
  }
  return ranges
}
