import { describe, expect, it } from 'vitest'
import { buildState, HOUR, local, makeGroup, makeTimer, MINUTE, session } from '../domain/testUtils'
import { selectDayTotalMs, selectDefaultGroup, selectTimersOfGroup, selectTimerTimes } from './selectors'

// An open session that started yesterday at 23:00, read today at 01:30.
const NOW = local(2026, 10, 21, 1, 30)
const state = buildState({
  timers: [makeTimer('a', 'g1'), makeTimer('b', 'g1', { order: 1 })],
  entries: [
    session('s1', 'a', local(2026, 10, 20, 10), local(2026, 10, 20, 11)),
    session('s2', 'a', local(2026, 10, 20, 23)),
    session('s3', 'b', local(2026, 10, 21, 0, 30), local(2026, 10, 21, 0, 45)),
  ],
  settings: { singleRunning: false },
})

describe('selectTimerTimes', () => {
  it('splits an open session that crosses midnight between total and today', () => {
    expect(selectTimerTimes(state, 'a', NOW)).toEqual({ totalMs: HOUR + 2.5 * HOUR, todayMs: 1.5 * HOUR, running: true })
    expect(selectTimerTimes(state, 'b', NOW)).toEqual({ totalMs: 15 * MINUTE, todayMs: 15 * MINUTE, running: false })
  })
})

describe('selectDayTotalMs', () => {
  it('counts only today, including the open session until now', () => {
    expect(selectDayTotalMs(state, NOW)).toBe(1.5 * HOUR + 15 * MINUTE)
  })
})

describe('selectTimersOfGroup', () => {
  it('returns the active timers of the group by order', () => {
    const data = buildState({
      groups: [makeGroup('g1'), makeGroup('g2', { order: 1 })],
      timers: [
        makeTimer('c', 'g1', { order: 2 }),
        makeTimer('a', 'g1', { order: 0 }),
        makeTimer('x', 'g2'),
        makeTimer('archived', 'g1', { order: 1, archivedAt: 1 }),
      ],
    })
    expect(selectTimersOfGroup(data, 'g1').map((timer) => timer.id)).toEqual(['a', 'c'])
  })
})

describe('selectDefaultGroup', () => {
  it('prefers the active "General", then the first active group', () => {
    const general = makeGroup('general', { name: 'General', order: 2 })
    expect(selectDefaultGroup(buildState({ groups: [makeGroup('g1'), general] }))).toBe(general)
    const first = makeGroup('first', { order: 1 })
    expect(selectDefaultGroup(buildState({ groups: [makeGroup('z', { order: 3 }), first] }))).toBe(first)
  })
})
