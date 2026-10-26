import { describe, expect, it } from 'vitest'
import {
  enforceSingleRunning,
  getOpenSession,
  getRunningTimerIds,
  isTimerRunning,
  pauseTimer,
  startTimer,
  toggleTimer,
} from './sessions'
import { buildState, makeTimer, sequentialIds, session } from './testUtils'
import type { PersistedState } from './types'

function twoTimers(partial: Partial<PersistedState> = {}): PersistedState {
  return buildState({ timers: [makeTimer('a', 'g1'), makeTimer('b', 'g1', { order: 1 })], ...partial })
}

describe('startTimer', () => {
  it('opens a session at now', () => {
    const state = startTimer(twoTimers(), 'a', 1000, sequentialIds('s'))
    expect(state.entries).toEqual([session('s-1', 'a', 1000)])
    expect(isTimerRunning(state, 'a')).toBe(true)
  })

  it('does not open a second session for a running timer (invariant 1)', () => {
    const running = startTimer(twoTimers(), 'a', 1000, sequentialIds('s'))
    expect(startTimer(running, 'a', 2000, sequentialIds('x'))).toBe(running)
  })

  it('closes other open sessions at the same now with singleRunning (invariant 2)', () => {
    const state = startTimer(twoTimers({ entries: [session('s0', 'b', 500)] }), 'a', 1000, sequentialIds('s'))
    expect(state.entries).toEqual([session('s0', 'b', 500, 1000), session('s-1', 'a', 1000)])
  })

  it('keeps several sessions open without singleRunning', () => {
    const base = twoTimers({ entries: [session('s0', 'b', 500)], settings: { singleRunning: false } })
    const state = startTimer(base, 'a', 1000, sequentialIds('s'))
    expect(getRunningTimerIds(state)).toEqual(['b', 'a'])
  })

  it('ignores unknown timers', () => {
    const state = twoTimers()
    expect(startTimer(state, 'missing', 1000, sequentialIds())).toBe(state)
  })
})

describe('pauseTimer', () => {
  it('closes the open session at now', () => {
    const state = pauseTimer(twoTimers({ entries: [session('s1', 'a', 1000)] }), 'a', 4000)
    expect(state.entries).toEqual([session('s1', 'a', 1000, 4000)])
    expect(getOpenSession(state.entries, 'a')).toBeUndefined()
  })

  it('does nothing for a paused timer', () => {
    const state = twoTimers({ entries: [session('s1', 'a', 1000, 2000)] })
    expect(pauseTimer(state, 'a', 4000)).toBe(state)
  })

  it('never ends a session before it started, even if the clock went backwards (invariant 3)', () => {
    const state = pauseTimer(twoTimers({ entries: [session('s1', 'a', 5000)] }), 'a', 3000)
    expect(state.entries[0]).toEqual(session('s1', 'a', 5000, 5000))
  })
})

describe('toggleTimer', () => {
  it('starts a paused timer and pauses a running one', () => {
    const started = toggleTimer(twoTimers(), 'a', 1000, sequentialIds('s'))
    expect(isTimerRunning(started, 'a')).toBe(true)
    const paused = toggleTimer(started, 'a', 3000, sequentialIds('x'))
    expect(paused.entries).toEqual([session('s-1', 'a', 1000, 3000)])
  })
})

describe('enforceSingleRunning', () => {
  it('keeps only the most recently started session open', () => {
    const base = buildState({
      timers: [makeTimer('a', 'g1'), makeTimer('b', 'g1'), makeTimer('c', 'g1')],
      entries: [session('s1', 'a', 1000), session('s2', 'b', 3000), session('s3', 'c', 2000)],
      settings: { singleRunning: false },
    })
    const state = enforceSingleRunning(base, 9000)
    expect(state.entries).toEqual([
      session('s1', 'a', 1000, 9000),
      session('s2', 'b', 3000),
      session('s3', 'c', 2000, 9000),
    ])
  })

  it('returns the same state with one or no open session', () => {
    const none = twoTimers()
    const one = twoTimers({ entries: [session('s1', 'a', 1000)] })
    expect(enforceSingleRunning(none, 9000)).toBe(none)
    expect(enforceSingleRunning(one, 9000)).toBe(one)
  })
})

describe('immutability', () => {
  it('does not mutate the input state', () => {
    const base = twoTimers({ entries: [session('s0', 'b', 500), session('s1', 'a', 100)], settings: { singleRunning: false } })
    const snapshot = structuredClone(base)
    startTimer(base, 'a', 1000, sequentialIds())
    pauseTimer(base, 'b', 1000)
    enforceSingleRunning(base, 1000)
    expect(base).toEqual(snapshot)
  })
})
