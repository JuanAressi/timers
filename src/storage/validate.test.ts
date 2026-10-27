import { describe, expect, it } from 'vitest'
import { adjustment, buildState, makeGroup, makeTimer, session } from '../domain/testUtils'
import type { PersistedState } from '../domain/types'
import { parseStateShape } from './validate'

/** A JSON round trip, like data read from storage. */
function fromJson(value: unknown): unknown {
  return JSON.parse(JSON.stringify(value))
}

function validState(): PersistedState {
  return buildState({
    timers: [makeTimer('a', 'g1'), makeTimer('legacy-abc', 'g1', { order: 1, icon: 'code', archivedAt: 5000 })],
    entries: [session('s1', 'a', 1000, 2000), session('s2', 'a', 3000), adjustment('a1', 'legacy-abc', 1000, -500, 'nota')],
  })
}

/** `validState` changed by `edit`. Wrong types are forced with `as never`. */
function withChange(edit: (state: PersistedState) => void): unknown {
  const state = validState()
  edit(state)
  return state
}

function without(key: keyof PersistedState): unknown {
  const state: Partial<PersistedState> = validState()
  delete state[key]
  return state
}

describe('parseStateShape', () => {
  it('accepts a valid state, with an open session and legacy ids', () => {
    const state = fromJson(validState())
    expect(parseStateShape(state)).toEqual({ ok: true, value: state })
  })

  it('rejects null, an array and a state without schemaVersion', () => {
    expect(parseStateShape(null).ok).toBe(false)
    expect(parseStateShape([]).ok).toBe(false)
    expect(parseStateShape(without('schemaVersion')).ok).toBe(false)
  })

  it('rejects an entry with an unknown type', () => {
    const result = parseStateShape(withChange((state) => (state.entries[0] = { ...state.entries[0], type: 'pause' } as never)))
    expect(result).toEqual({ ok: false, error: 'entries[0] is invalid' })
  })

  it('rejects NaN and Infinity in times', () => {
    // JSON can't hold them, but a migration could produce them.
    expect(parseStateShape(withChange((state) => (state.entries[0] = session('s1', 'a', Number.NaN, 2000)))).ok).toBe(false)
    expect(parseStateShape(withChange((state) => (state.entries[2] = adjustment('a1', 'a', 1000, Infinity)))).ok).toBe(false)
    expect(parseStateShape(withChange((state) => (state.timers[0].createdAt = -Infinity))).ok).toBe(false)
  })

  it('rejects a color that is not hex', () => {
    expect(parseStateShape(withChange((state) => (state.groups[0].color = 'green'))).ok).toBe(false)
    expect(parseStateShape(withChange((state) => (state.timers[0].color = '#2f7d5')))).toEqual({ ok: false, error: 'timers[0] is invalid' })
  })

  it('rejects missing or invalid settings', () => {
    expect(parseStateShape(without('settings'))).toEqual({ ok: false, error: 'settings are invalid' })
    expect(parseStateShape(withChange((state) => (state.settings = { singleRunning: 'yes' } as never))).ok).toBe(false)
  })

  it('rejects wrong field types', () => {
    expect(parseStateShape(withChange((state) => (state.groups = {} as never)))).toEqual({ ok: false, error: 'groups is not an array' })
    expect(parseStateShape(withChange((state) => (state.timers[1].groupId = 1 as never))).ok).toBe(false)
    expect(parseStateShape(withChange((state) => (state.timers[1].icon = undefined as never))).ok).toBe(false)
    expect(parseStateShape(withChange((state) => (state.entries[2] = { ...state.entries[2], note: 3 } as never))).ok).toBe(false)
  })

  it('accepts broken relations: the repair handles them', () => {
    const state = fromJson(
      buildState({
        groups: [makeGroup('g1'), makeGroup('g1')],
        timers: [makeTimer('a', 'gone')],
        entries: [session('s1', 'missing', 2000, 1000), session('s2', 'a', 1000), session('s3', 'a', 2000)],
      }),
    )
    expect(parseStateShape(state).ok).toBe(true)
  })
})
