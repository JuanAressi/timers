import { describe, expect, it } from 'vitest'
import { getDayRange, getWeekRange } from './dates'
import {
  getDayTotalMs,
  getGroupRangeMs,
  getGroupTotalMs,
  getOverlapMs,
  getSessionDurationMs,
  getTimerRangeMs,
  getTimerTodayMs,
  getTimerTotalMs,
} from './totals'
import { adjustment, buildState, HOUR, local, makeGroup, makeTimer, MINUTE, session } from './testUtils'

const timers = [makeTimer('a', 'g1'), makeTimer('b', 'g1', { order: 1 }), makeTimer('c', 'g2')]
const groups = [makeGroup('g1'), makeGroup('g2', { order: 1 }), makeGroup('empty', { order: 2 })]

describe('getSessionDurationMs', () => {
  it('measures closed and open sessions', () => {
    expect(getSessionDurationMs(session('s', 'a', 1000, 4000), 9000)).toBe(3000)
    expect(getSessionDurationMs(session('s', 'a', 1000), 9000)).toBe(8000)
  })

  it('is never negative', () => {
    expect(getSessionDurationMs(session('s', 'a', 5000), 3000)).toBe(0)
  })
})

describe('getOverlapMs', () => {
  it('clips the session to the range and an open one to now', () => {
    const range = { start: 1000, end: 5000 }
    expect(getOverlapMs(session('s', 'a', 0, 2000), range, 9000)).toBe(1000)
    expect(getOverlapMs(session('s', 'a', 3000), range, 4000)).toBe(1000)
    expect(getOverlapMs(session('s', 'a', 6000, 7000), range, 9000)).toBe(0)
  })
})

describe('getTimerTotalMs', () => {
  it('adds sessions, the open one until now, and adjustments', () => {
    const state = buildState({
      timers,
      entries: [
        session('s1', 'a', 0, HOUR),
        session('s2', 'a', 2 * HOUR),
        adjustment('j1', 'a', HOUR, 15 * MINUTE),
        session('s3', 'b', 0, HOUR),
      ],
    })
    expect(getTimerTotalMs(state, 'a', 3 * HOUR)).toBe(2 * HOUR + 15 * MINUTE)
  })

  it('is clamped to zero when removing time leaves a negative sum', () => {
    // +60 then a clamped -30: if the +60 adjustment is later deleted, the -30 alone would be negative.
    const state = buildState({ timers, entries: [adjustment('j2', 'a', 2000, -30 * MINUTE)] })
    expect(getTimerTotalMs(state, 'a', 3000)).toBe(0)
  })
})

describe('time per day', () => {
  it('splits a session across midnight', () => {
    const state = buildState({ timers, entries: [session('s1', 'a', local(2026, 10, 20, 23, 30), local(2026, 10, 21, 0, 30))] })
    const now = local(2026, 10, 21, 12)
    expect(getTimerRangeMs(state, 'a', getDayRange(local(2026, 10, 20)), now)).toBe(30 * MINUTE)
    expect(getTimerTodayMs(state, 'a', now)).toBe(30 * MINUTE)
  })

  it('counts an open session from yesterday only since midnight', () => {
    const state = buildState({ timers, entries: [session('s1', 'a', local(2026, 10, 20, 23))] })
    expect(getTimerTodayMs(state, 'a', local(2026, 10, 21, 1))).toBe(HOUR)
    expect(getTimerTotalMs(state, 'a', local(2026, 10, 21, 1))).toBe(2 * HOUR)
  })

  it('spreads a 3-day session over the three days', () => {
    const state = buildState({ timers, entries: [session('s1', 'a', local(2026, 10, 19, 12), local(2026, 10, 21, 12))] })
    const now = local(2026, 10, 22)
    const days = [19, 20, 21].map((day) => getTimerRangeMs(state, 'a', getDayRange(local(2026, 10, day)), now))
    expect(days).toEqual([12 * HOUR, 24 * HOUR, 12 * HOUR])
  })

  it('counts the 25 h of the autumn DST day', () => {
    const state = buildState({ timers, entries: [session('s1', 'a', local(2026, 10, 25), local(2026, 10, 26))] })
    expect(getTimerRangeMs(state, 'a', getDayRange(local(2026, 10, 25)), local(2026, 10, 27))).toBe(25 * HOUR)
  })

  it('counts an adjustment on the day of its at', () => {
    const state = buildState({ timers, entries: [adjustment('j1', 'a', local(2026, 10, 20, 18), 15 * MINUTE)] })
    const now = local(2026, 10, 21, 12)
    expect(getTimerRangeMs(state, 'a', getDayRange(local(2026, 10, 20)), now)).toBe(15 * MINUTE)
    expect(getTimerTodayMs(state, 'a', now)).toBe(0)
  })

  it('returns the real negative value for the day, so the days add up to the total', () => {
    const state = buildState({
      timers,
      entries: [
        session('s1', 'a', local(2026, 10, 20, 9), local(2026, 10, 20, 11)),
        adjustment('j1', 'a', local(2026, 10, 21, 9), -30 * MINUTE),
      ],
    })
    const now = local(2026, 10, 21, 12)
    const yesterday = getTimerRangeMs(state, 'a', getDayRange(local(2026, 10, 20)), now)
    const today = getTimerTodayMs(state, 'a', now)
    expect(today).toBe(-30 * MINUTE)
    expect(yesterday + today).toBe(getTimerTotalMs(state, 'a', now))
  })

  it('ignores adjustments outside the range', () => {
    const state = buildState({ timers, entries: [adjustment('j1', 'a', local(2026, 10, 12), 15 * MINUTE)] })
    expect(getTimerRangeMs(state, 'a', getWeekRange(local(2026, 10, 21)), local(2026, 10, 21))).toBe(0)
  })
})

describe('group and day totals', () => {
  const now = local(2026, 10, 21, 12)
  const state = buildState({
    groups,
    timers,
    entries: [
      session('s1', 'a', local(2026, 10, 21, 9), local(2026, 10, 21, 10)),
      session('s2', 'b', local(2026, 10, 20, 9), local(2026, 10, 20, 10)),
      session('s3', 'c', local(2026, 10, 21, 11)),
    ],
  })

  it('adds up the timers of the group', () => {
    expect(getGroupTotalMs(state, 'g1', now)).toBe(2 * HOUR)
    expect(getGroupRangeMs(state, 'g1', getDayRange(now), now)).toBe(HOUR)
    expect(getGroupTotalMs(state, 'g2', now)).toBe(HOUR)
  })

  it('gives zero for a group without timers', () => {
    expect(getGroupTotalMs(state, 'empty', now)).toBe(0)
  })

  it('adds today across every timer, including the open session', () => {
    expect(getDayTotalMs(state, now)).toBe(2 * HOUR)
  })
})
