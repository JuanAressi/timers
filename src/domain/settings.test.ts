import { describe, expect, it } from 'vitest'
import { setSingleRunning } from './settings'
import { buildState, makeTimer, session } from './testUtils'

const NOW = 10_000

const threeRunning = buildState({
  settings: { singleRunning: false },
  timers: [makeTimer('a', 'g1'), makeTimer('b', 'g1', { order: 1 }), makeTimer('c', 'g1', { order: 2 })],
  entries: [session('s1', 'a', 1000), session('s2', 'b', 3000), session('s3', 'c', 2000)],
})

describe('setSingleRunning', () => {
  it('turning it off changes the setting but not the sessions', () => {
    const state = buildState({ timers: [makeTimer('a', 'g1')], entries: [session('s1', 'a', 1000)] })
    const result = setSingleRunning(state, false, NOW)
    expect(result.settings.singleRunning).toBe(false)
    expect(result.entries).toBe(state.entries)
  })

  it('turning it on with three timers running keeps only the last one started', () => {
    const result = setSingleRunning(threeRunning, true, NOW)
    expect(result.settings.singleRunning).toBe(true)
    expect(result.entries).toEqual([session('s1', 'a', 1000, NOW), session('s2', 'b', 3000), session('s3', 'c', 2000, NOW)])
  })

  it('returns the same state when the value does not change', () => {
    expect(setSingleRunning(threeRunning, false, NOW)).toBe(threeRunning)
  })
})
