import { describe, expect, it } from 'vitest'
import { DEFAULT_GROUP_NAME } from './defaults'
import { findInvariantViolations } from './invariants'
import { repairState } from './repair'
import { adjustment, buildState, local, makeGroup, makeTimer, sequentialIds, session } from './testUtils'
import type { PersistedState } from './types'

const NOW = local(2026, 10, 26, 13)
const at = (hours: number, minutes = 0) => local(2026, 10, 26, hours, minutes)

/** Repairs a broken state and checks that the result breaks no invariant. */
function repair(state: PersistedState) {
  expect(findInvariantViolations(state)).not.toEqual([])
  const result = repairState(state, NOW, sequentialIds('new'))
  expect(findInvariantViolations(result.state)).toEqual([])
  return result
}

describe('repairState', () => {
  it('keeps only the latest of several open sessions, closing each at the start of the next one', () => {
    const { state, repairs } = repair(
      buildState({
        timers: [makeTimer('a', 'g1')],
        entries: [session('s1', 'a', at(10)), session('s2', 'a', at(11)), session('s3', 'a', at(12))],
      }),
    )
    expect(state.entries).toEqual([
      session('s1', 'a', at(10), at(11)),
      session('s2', 'a', at(11), at(12)),
      session('s3', 'a', at(12)),
    ])
    expect(repairs).toEqual([
      { type: 'closed-extra-open-session', entryId: 's1', timerId: 'a' },
      { type: 'closed-extra-open-session', entryId: 's2', timerId: 'a' },
    ])
  })

  it('closes an open session at the start of a later closed session of the same timer', () => {
    const { state } = repair(
      buildState({
        timers: [makeTimer('a', 'g1')],
        entries: [session('s2', 'a', at(11), at(11, 30)), session('s1', 'a', at(10))],
      }),
    )
    expect(state.entries).toEqual([session('s2', 'a', at(11), at(11, 30)), session('s1', 'a', at(10), at(11))])
  })

  it('moves a timer of a missing group to the end of the existing "General"', () => {
    const general = makeGroup('general', { name: DEFAULT_GROUP_NAME })
    const { state, repairs } = repair(
      buildState({
        groups: [general],
        timers: [makeTimer('a', 'general'), makeTimer('lost', 'gone')],
      }),
    )
    expect(state.groups).toEqual([general])
    expect(state.timers[1]).toMatchObject({ id: 'lost', groupId: 'general', order: 1 })
    expect(repairs).toEqual([{ type: 'moved-orphan-timer', timerId: 'lost', fromGroupId: 'gone', toGroupId: 'general' }])
  })

  it('creates "General" for timers of a missing group when it does not exist', () => {
    const { state, repairs } = repair(
      buildState({
        groups: [makeGroup('work', { order: 3 })],
        timers: [makeTimer('lost1', 'gone'), makeTimer('lost2', 'gone', { order: 7 })],
      }),
    )
    expect(state.groups[1]).toMatchObject({ id: 'new-1', name: DEFAULT_GROUP_NAME, order: 4, createdAt: NOW })
    expect(state.timers.map(({ id, groupId, order }) => ({ id, groupId, order }))).toEqual([
      { id: 'lost1', groupId: 'new-1', order: 0 },
      { id: 'lost2', groupId: 'new-1', order: 1 },
    ])
    expect(repairs[0]).toEqual({ type: 'created-default-group', groupId: 'new-1' })
  })

  it('drops entries whose timer does not exist', () => {
    const { state, repairs } = repair(
      buildState({
        timers: [makeTimer('a', 'g1')],
        entries: [session('s1', 'a', at(9), at(10)), session('s2', 'gone', at(10)), adjustment('a1', 'gone', at(10), 5000)],
      }),
    )
    expect(state.entries).toEqual([session('s1', 'a', at(9), at(10))])
    expect(repairs).toEqual([
      { type: 'dropped-orphan-entry', entryId: 's2', timerId: 'gone' },
      { type: 'dropped-orphan-entry', entryId: 'a1', timerId: 'gone' },
    ])
  })

  it('makes a closed session that ends before it starts end when it starts', () => {
    const { state, repairs } = repair(
      buildState({ timers: [makeTimer('a', 'g1')], entries: [session('s1', 'a', at(10), at(9))] }),
    )
    expect(state.entries).toEqual([session('s1', 'a', at(10), at(10))])
    expect(repairs).toEqual([{ type: 'fixed-session-end', entryId: 's1' }])
  })

  it('gives a new id to a repeated entry id', () => {
    const { state, repairs } = repair(
      buildState({
        timers: [makeTimer('a', 'g1')],
        entries: [session('dup', 'a', at(9), at(10)), adjustment('dup', 'a', at(10), 5000)],
      }),
    )
    expect(state.entries).toEqual([session('dup', 'a', at(9), at(10)), adjustment('new-1', 'a', at(10), 5000)])
    expect(repairs).toEqual([{ type: 'reassigned-duplicate-id', previousId: 'dup', entryId: 'new-1' }])
  })

  it('never reuses an existing id for a reassigned entry', () => {
    const { state } = repair(
      buildState({
        timers: [makeTimer('a', 'g1')],
        entries: [adjustment('new-1', 'a', at(9), 1), adjustment('new-1', 'a', at(10), 2)],
      }),
    )
    expect(state.entries.map((entry) => entry.id)).toEqual(['new-1', 'new-2'])
  })

  it('keeps the first of two timers with the same id, with the entries of both', () => {
    const { state, repairs } = repair(
      buildState({
        timers: [makeTimer('a', 'g1', { name: 'first' }), makeTimer('a', 'g1', { name: 'second', order: 1 })],
        entries: [adjustment('a1', 'a', at(8), 5000), session('s1', 'a', at(9), at(10))],
      }),
    )
    expect(state.timers).toEqual([makeTimer('a', 'g1', { name: 'first' })])
    expect(state.entries).toEqual([adjustment('a1', 'a', at(8), 5000), session('s1', 'a', at(9), at(10))])
    expect(repairs).toEqual([{ type: 'merged-duplicate', entity: 'timer', id: 'a' }])
  })

  it('leaves a single open session when both timers with the same id were running', () => {
    const { state } = repair(
      buildState({
        timers: [makeTimer('a', 'g1'), makeTimer('a', 'g1')],
        entries: [session('s1', 'a', at(10)), session('s2', 'a', at(11))],
        settings: { singleRunning: false },
      }),
    )
    expect(state.entries).toEqual([session('s1', 'a', at(10), at(11)), session('s2', 'a', at(11))])
  })

  it('closes the gap left by a discarded duplicate timer in its group', () => {
    const { state } = repair(
      buildState({
        groups: [makeGroup('g1'), makeGroup('g2', { order: 1 })],
        timers: [makeTimer('a', 'g1'), makeTimer('b', 'g2'), makeTimer('a', 'g2', { order: 1 }), makeTimer('c', 'g2', { order: 2 })],
      }),
    )
    expect(state.timers.map(({ id, groupId, order }) => `${id}:${groupId}:${order}`)).toEqual([
      'a:g1:0',
      'b:g2:0',
      'c:g2:1',
    ])
  })

  it('keeps the first of two groups with the same id, with the timers of both and no gaps in their order', () => {
    const { state, repairs } = repair(
      buildState({
        groups: [makeGroup('g1', { name: 'first' }), makeGroup('g1', { name: 'second', order: 1 })],
        timers: [makeTimer('a', 'g1'), makeTimer('b', 'g1', { order: 4 }), makeTimer('c', 'g1', { order: 2 })],
      }),
    )
    expect(state.groups).toEqual([makeGroup('g1', { name: 'first' })])
    expect(state.timers.map(({ id, order }) => `${id}:${order}`)).toEqual(['a:0', 'b:2', 'c:1'])
    expect(repairs).toEqual([{ type: 'merged-duplicate', entity: 'group', id: 'g1' }])
  })

  it('with singleRunning and two running timers, keeps only the most recent one open', () => {
    const { state, repairs } = repair(
      buildState({
        timers: [makeTimer('a', 'g1'), makeTimer('b', 'g1', { order: 1 })],
        entries: [session('s1', 'a', at(11)), session('s2', 'b', at(10))],
      }),
    )
    expect(state.entries).toEqual([session('s1', 'a', at(11)), session('s2', 'b', at(10), NOW)])
    expect(repairs).toEqual([{ type: 'enforced-single-running', entryIds: ['s2'] }])
  })

  it('creates "General" when there are no groups (invariant 5)', () => {
    const { state, repairs } = repair(buildState({ groups: [] }))
    expect(state.groups).toEqual([makeGroup('new-1', { name: DEFAULT_GROUP_NAME, createdAt: NOW })])
    expect(repairs).toEqual([{ type: 'created-default-group', groupId: 'new-1' }])
  })

  it('returns the same object and no repairs for a valid state', () => {
    const state = buildState({
      timers: [makeTimer('a', 'g1'), makeTimer('legacy-abc', 'g1', { order: 1 })],
      entries: [session('s1', 'a', at(9), at(10)), session('s2', 'a', at(11)), adjustment('a1', 'legacy-abc', at(8), 5000)],
    })
    const result = repairState(state, NOW, sequentialIds('new'))
    expect(result.state).toBe(state)
    expect(result.repairs).toEqual([])
  })

  it('is idempotent: repairing a repaired state changes nothing', () => {
    // Breaks every rule at once.
    const broken = buildState({
      groups: [makeGroup('g1'), makeGroup('g1', { order: 1 })],
      timers: [
        makeTimer('a', 'g1'),
        makeTimer('a', 'g1', { order: 1 }),
        makeTimer('b', 'gone'),
        makeTimer('c', 'g1', { order: 5 }),
      ],
      entries: [
        session('s1', 'a', at(9)),
        session('s2', 'a', at(10)),
        session('s1', 'b', at(8)),
        session('s3', 'c', at(12), at(11)),
        session('s4', 'c', at(12, 30)),
        adjustment('x', 'gone', at(9), 1000),
      ],
    })
    const first = repair(broken)
    expect(first.repairs.map((item) => item.type)).toEqual([
      'merged-duplicate',
      'merged-duplicate',
      'reassigned-duplicate-id',
      'created-default-group',
      'moved-orphan-timer',
      'dropped-orphan-entry',
      'fixed-session-end',
      'closed-extra-open-session',
      'enforced-single-running',
    ])

    const second = repairState(first.state, NOW + 60_000, sequentialIds('again'))
    expect(second.state).toBe(first.state)
    expect(second.repairs).toEqual([])
  })

  it('does not mutate the input state', () => {
    const broken = buildState({
      groups: [makeGroup('g1'), makeGroup('g1')],
      timers: [makeTimer('a', 'g1'), makeTimer('b', 'gone')],
      entries: [session('s1', 'a', at(10)), session('s1', 'a', at(9), at(8)), session('s2', 'b', at(11))],
    })
    const snapshot = structuredClone(broken)
    repairState(broken, NOW, sequentialIds('new'))
    expect(broken).toEqual(snapshot)
  })
})
