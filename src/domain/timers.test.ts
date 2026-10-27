import { describe, expect, it } from 'vitest'
import { DEFAULT_COLOR } from './defaults'
import { buildState, makeGroup, makeTimer, sequentialIds } from './testUtils'
import { addTimer, MAX_TIMER_NAME_LENGTH, normalizeTimerName, renameTimer, UNNAMED_TIMER } from './timers'

const groups = [makeGroup('g1'), makeGroup('g2', { order: 1 })]

describe('addTimer', () => {
  it('adds the timer at the end of its group with the next order', () => {
    const state = buildState({
      groups,
      timers: [makeTimer('a', 'g1'), makeTimer('b', 'g1', { order: 1 }), makeTimer('c', 'g2', { order: 7 })],
    })
    const result = addTimer(state, { groupId: 'g1', name: '  Proyecto  ' }, 5000, sequentialIds('t'))
    expect(result).toEqual({
      ok: true,
      value: {
        ...state,
        timers: [
          ...state.timers,
          {
            id: 't-1',
            groupId: 'g1',
            name: 'Proyecto',
            icon: null,
            color: DEFAULT_COLOR,
            order: 2,
            archivedAt: null,
            createdAt: 5000,
          },
        ],
      },
    })
  })

  it('starts at order 0 in an empty group', () => {
    const result = addTimer(buildState({ groups }), { groupId: 'g2', name: 'Uno' }, 0, sequentialIds('t'))
    expect(result.ok && result.value.timers[0]?.order).toBe(0)
  })

  it('rejects an empty name', () => {
    expect(addTimer(buildState(), { groupId: 'g1', name: '   ' }, 0, sequentialIds('t'))).toEqual({
      ok: false,
      error: 'empty name',
    })
  })

  it('rejects a missing group', () => {
    expect(addTimer(buildState(), { groupId: 'nope', name: 'Uno' }, 0, sequentialIds('t')).ok).toBe(false)
  })

  it('cuts the name to the maximum length', () => {
    const result = addTimer(buildState(), { groupId: 'g1', name: 'x'.repeat(100) }, 0, sequentialIds('t'))
    expect(result.ok && result.value.timers[0]?.name).toBe('x'.repeat(MAX_TIMER_NAME_LENGTH))
  })
})

describe('renameTimer', () => {
  const state = buildState({ timers: [makeTimer('a', 'g1', { name: 'Viejo' }), makeTimer('b', 'g1', { order: 1 })] })

  it('trims the name', () => {
    expect(renameTimer(state, 'a', '  Nuevo  ').timers[0]?.name).toBe('Nuevo')
  })

  it('uses "Sin nombre" for an empty name', () => {
    expect(renameTimer(state, 'a', '').timers[0]?.name).toBe(UNNAMED_TIMER)
    expect(renameTimer(state, 'a', '   ').timers[0]?.name).toBe(UNNAMED_TIMER)
  })

  it('cuts names longer than the maximum', () => {
    expect(renameTimer(state, 'a', 'y'.repeat(81)).timers[0]?.name).toBe('y'.repeat(MAX_TIMER_NAME_LENGTH))
  })

  it('leaves the other timers alone', () => {
    expect(renameTimer(state, 'a', 'Nuevo').timers[1]).toBe(state.timers[1])
  })

  it('returns the same state when the name does not change or the timer does not exist', () => {
    expect(renameTimer(state, 'a', ' Viejo ')).toBe(state)
    expect(renameTimer(state, 'nope', 'Nuevo')).toBe(state)
  })
})

describe('normalizeTimerName', () => {
  it('matches what renameTimer stores', () => {
    expect(normalizeTimerName('  Nuevo ')).toBe('Nuevo')
    expect(normalizeTimerName('')).toBe(UNNAMED_TIMER)
  })
})
