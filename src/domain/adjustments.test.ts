import { describe, expect, it } from 'vitest'
import { addAdjustment, clampAdjustment } from './adjustments'
import { getTimerTodayMs, getTimerTotalMs } from './totals'
import { adjustment, buildState, local, makeTimer, MINUTE, sequentialIds, session } from './testUtils'

describe('clampAdjustment', () => {
  it('limits a negative delta to the current total', () => {
    expect(clampAdjustment(-5 * MINUTE, 3 * MINUTE)).toBe(-3 * MINUTE)
    expect(clampAdjustment(-5 * MINUTE, 0)).toBe(0)
  })

  it('leaves positive deltas and small negatives alone', () => {
    expect(clampAdjustment(15 * MINUTE, 0)).toBe(15 * MINUTE)
    expect(clampAdjustment(-5 * MINUTE, 60 * MINUTE)).toBe(-5 * MINUTE)
  })
})

describe('addAdjustment', () => {
  const now = local(2026, 10, 21, 12)
  // 3 minutes of time today.
  const base = buildState({
    timers: [makeTimer('a', 'g1')],
    entries: [session('s1', 'a', local(2026, 10, 21, 9), local(2026, 10, 21, 9, 3))],
  })

  function add(input: Parameters<typeof addAdjustment>[1]) {
    const result = addAdjustment(base, input, now, sequentialIds('j'))
    if (!result.ok) throw new Error(result.error)
    return result.value
  }

  it('stores the clamped delta at now', () => {
    const state = add({ timerId: 'a', deltaMs: -5 * MINUTE })
    expect(state.entries.at(-1)).toEqual(adjustment('j-1', 'a', now, -3 * MINUTE))
    expect(getTimerTotalMs(state, 'a', now)).toBe(0)
  })

  it('trims the note and turns a blank one into null', () => {
    expect(add({ timerId: 'a', deltaMs: MINUTE, note: '  forgot  ' }).entries.at(-1)).toMatchObject({ note: 'forgot' })
    expect(add({ timerId: 'a', deltaMs: MINUTE, note: '  ' }).entries.at(-1)).toMatchObject({ note: null })
  })

  it('counts a past at on that day, not today', () => {
    const state = add({ timerId: 'a', deltaMs: 30 * MINUTE, at: local(2026, 10, 20, 18) })
    expect(getTimerTotalMs(state, 'a', now)).toBe(33 * MINUTE)
    expect(getTimerTodayMs(state, 'a', now)).toBe(3 * MINUTE)
  })

  it('rejects a future at', () => {
    expect(addAdjustment(base, { timerId: 'a', deltaMs: MINUTE, at: now + 1 }, now, sequentialIds())).toEqual({
      ok: false,
      error: 'future-date',
    })
  })

  it('fails without changes when the clamped delta is zero', () => {
    const empty = buildState({ timers: [makeTimer('a', 'g1')] })
    expect(addAdjustment(empty, { timerId: 'a', deltaMs: -5 * MINUTE }, now, sequentialIds())).toEqual({
      ok: false,
      error: 'zero-delta',
    })
  })

  it('fails for an unknown timer', () => {
    expect(addAdjustment(base, { timerId: 'missing', deltaMs: MINUTE }, now, sequentialIds())).toEqual({
      ok: false,
      error: 'timer-not-found',
    })
  })

  it('does not mutate the input state', () => {
    const snapshot = structuredClone(base)
    add({ timerId: 'a', deltaMs: MINUTE })
    expect(base).toEqual(snapshot)
  })
})
