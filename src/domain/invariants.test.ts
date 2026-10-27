import { describe, expect, it } from 'vitest'
import { findInvariantViolations } from './invariants'
import { adjustment, buildState, makeGroup, makeTimer, session } from './testUtils'

describe('findInvariantViolations', () => {
  it('finds nothing in a valid state', () => {
    const state = buildState({
      timers: [makeTimer('a', 'g1'), makeTimer('b', 'g1', { order: 1 })],
      entries: [session('s1', 'a', 1000, 2000), session('s2', 'a', 3000), adjustment('a1', 'b', 1000, -500)],
    })
    expect(findInvariantViolations(state)).toEqual([])
  })

  it('finds repeated ids of groups, timers and entries', () => {
    const state = buildState({
      groups: [makeGroup('g1'), makeGroup('g1')],
      timers: [makeTimer('a', 'g1'), makeTimer('a', 'g1')],
      entries: [adjustment('e', 'a', 1000, 1), adjustment('e', 'a', 1000, 2)],
    })
    expect(findInvariantViolations(state)).toEqual(['duplicate group id g1', 'duplicate timer id a', 'duplicate entry id e'])
  })

  it('finds a state without groups and a timer of a missing group (invariant 5)', () => {
    expect(findInvariantViolations(buildState({ groups: [] }))).toEqual(['there are no groups'])
    expect(findInvariantViolations(buildState({ timers: [makeTimer('a', 'gone')] }))).toEqual([
      'timer a belongs to missing group gone',
    ])
  })

  it('finds entries of a missing timer', () => {
    expect(findInvariantViolations(buildState({ entries: [adjustment('e', 'gone', 1000, 1)] }))).toEqual([
      'entry e belongs to missing timer gone',
    ])
  })

  it('finds a closed session that ends before it starts (invariant 3)', () => {
    const state = buildState({ timers: [makeTimer('a', 'g1')], entries: [session('s1', 'a', 2000, 1000)] })
    expect(findInvariantViolations(state)).toEqual(['session s1 ends before it starts'])
  })

  it('finds a timer with two open sessions (invariant 1)', () => {
    const state = buildState({
      timers: [makeTimer('a', 'g1')],
      entries: [session('s1', 'a', 1000), session('s2', 'a', 2000)],
      settings: { singleRunning: false },
    })
    expect(findInvariantViolations(state)).toEqual([
      'timer a has more than one open session',
      'open session s1 is followed by session s2',
    ])
  })

  it('finds an open session followed by a later session of the same timer', () => {
    const state = buildState({ timers: [makeTimer('a', 'g1')], entries: [session('s1', 'a', 1000), session('s2', 'a', 2000, 3000)] })
    expect(findInvariantViolations(state)).toEqual(['open session s1 is followed by session s2'])
  })

  it('finds several running timers only with singleRunning (invariant 2)', () => {
    const partial = {
      timers: [makeTimer('a', 'g1'), makeTimer('b', 'g1')],
      entries: [session('s1', 'a', 1000), session('s2', 'b', 2000)],
    }
    expect(findInvariantViolations(buildState(partial))).toEqual(['more than one open session with singleRunning'])
    expect(findInvariantViolations(buildState({ ...partial, settings: { singleRunning: false } }))).toEqual([])
  })
})
