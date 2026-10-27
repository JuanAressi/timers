import { describe, expect, it } from 'vitest'
import fixture from '../storage/__fixtures__/legacy-backup.json'
import { parseLegacyBackup, type LegacyBackup, type LegacyTimer } from '../storage/legacyBackup'
import { createInitialState, DEFAULT_COLOR, DEFAULT_GROUP_NAME } from './defaults'
import { findInvariantViolations } from './invariants'
import { importLegacyBackup, LEGACY_IMPORT_NOTE, LEGACY_UNNAMED } from './legacyImport'
import { getRunningTimerIds } from './sessions'
import { adjustment, buildState, HOUR, local, makeGroup, makeTimer, MINUTE, sequentialIds, session } from './testUtils'
import type { PersistedState } from './types'

const NOW = local(2026, 10, 26, 13)
const EXPORTED_AT = '2026-10-25T09:00:00.000Z'

function legacyTimer(id: string, overrides: Partial<LegacyTimer> = {}): LegacyTimer {
  return { id, name: id, accumulatedMs: 0, startedAt: null, ...overrides }
}

function backup(timers: LegacyTimer[], exportedAt: string | null = EXPORTED_AT): LegacyBackup {
  return { exportedAt, timers }
}

function parsedFixture(): LegacyBackup {
  const parsed = parseLegacyBackup(fixture)
  if (!parsed.ok) throw new Error(parsed.error)
  return parsed.value
}

function emptyState(singleRunning = true): PersistedState {
  return { ...createInitialState(0, sequentialIds('g')), settings: { singleRunning } }
}

function importInto(state: PersistedState, file: LegacyBackup, now = NOW) {
  const result = importLegacyBackup(state, file, now, sequentialIds('new'))
  expect(findInvariantViolations(result.state)).toEqual([])
  return result
}

describe('importLegacyBackup', () => {
  it('turns the real prototype export into timers with their time', () => {
    const file = parsedFixture()
    const { state, imported, skipped } = importInto(emptyState(), file)
    const exportedAt = Date.parse(fixture.exportedAt)

    expect({ imported, skipped }).toEqual({ imported: 9, skipped: 0 })
    expect(state.timers.map((timer) => timer.name)).toEqual([
      'Voryn',
      'Cubrama',
      'Starlings',
      'Base',
      'Ocio',
      'Cosas de la casa',
      'I+D',
      'Finanzas personales',
      'SofiGior',
    ])
    expect(state.timers).toEqual(
      fixture.timers.map((legacy, order) =>
        makeTimer(`legacy-${legacy.id}`, 'g-1', { name: legacy.name, order, createdAt: NOW }),
      ),
    )
    // Every paused timer keeps its time as one adjustment at the export date; "Base" (0 ms) gets none.
    expect(state.entries).toEqual([
      adjustment('new-1', 'legacy-mvgqfphrr95ray', exportedAt, 3_915_756, LEGACY_IMPORT_NOTE),
      adjustment('new-2', 'legacy-mvgqg9eh1m8bq1', exportedAt, 16_970_277, LEGACY_IMPORT_NOTE),
      adjustment('new-3', 'legacy-mvgquwrodoh40r', exportedAt, 24_986_005, LEGACY_IMPORT_NOTE),
      adjustment('new-4', 'legacy-mvgtsnvby4wy92', exportedAt, 8_894_681, LEGACY_IMPORT_NOTE),
      adjustment('new-5', 'legacy-mvgu7eyvhh9ltq', exportedAt, 7_492_801, LEGACY_IMPORT_NOTE),
      adjustment('new-6', 'legacy-mvgzhcjzzdobq6', exportedAt, 5_421_795, LEGACY_IMPORT_NOTE),
      adjustment('new-7', 'legacy-mvh0xnecfi06vi', exportedAt, 650_581, LEGACY_IMPORT_NOTE),
      adjustment('new-8', 'legacy-mvp9tndgsotpfv', exportedAt, 925_375, LEGACY_IMPORT_NOTE),
    ])
    expect(getRunningTimerIds(state)).toEqual([])
  })

  it('opens a session at the exact startedAt of a running timer, besides its adjustment', () => {
    const startedAt = Date.parse(EXPORTED_AT) - 35 * MINUTE - 1234
    const file = backup([
      legacyTimer('paused', { name: 'Cliente Acme', accumulatedMs: 90 * MINUTE }),
      legacyTimer('running', { name: 'Portfolio', accumulatedMs: 20 * MINUTE, startedAt }),
    ])
    const { state } = importInto(emptyState(), file)
    const exportedAt = Date.parse(EXPORTED_AT)
    expect(state.entries).toEqual([
      adjustment('new-1', 'legacy-paused', exportedAt, 90 * MINUTE, LEGACY_IMPORT_NOTE),
      adjustment('new-2', 'legacy-running', exportedAt, 20 * MINUTE, LEGACY_IMPORT_NOTE),
      session('new-3', 'legacy-running', startedAt),
    ])
    expect(getRunningTimerIds(state)).toEqual(['legacy-running'])
  })

  it('importing the same backup twice does not duplicate timers', () => {
    const file = parsedFixture()
    const first = importInto(emptyState(), file)
    const second = importInto(first.state, file, NOW + HOUR)
    expect(second).toEqual({ state: first.state, imported: 0, skipped: 9 })
    expect(second.state).toBe(first.state)
    expect(second.state.timers).toHaveLength(9)
  })

  it('importing a running timer twice does not open a second session', () => {
    const file = backup([legacyTimer('running', { accumulatedMs: MINUTE, startedAt: NOW - HOUR })])
    const first = importInto(emptyState(), file)
    const second = importInto(first.state, file, NOW + HOUR)
    expect(second).toEqual({ state: first.state, imported: 0, skipped: 1 })
  })

  it('counts an archived timer with the same id as already imported', () => {
    const state = buildState({ timers: [makeTimer('legacy-a', 'g1', { archivedAt: 1000 })] })
    const result = importInto(state, backup([legacyTimer('a', { accumulatedMs: 5000 }), legacyTimer('b')]))
    expect(result.imported).toBe(1)
    expect(result.skipped).toBe(1)
    expect(result.state.timers.map((timer) => timer.id)).toEqual(['legacy-a', 'legacy-b'])
  })

  it('counts a repeated id inside the file once', () => {
    const result = importInto(emptyState(), backup([legacyTimer('a'), legacyTimer('a')]))
    expect(result.imported).toBe(1)
    expect(result.skipped).toBe(1)
  })

  it('without exportedAt, dates the adjustment at now', () => {
    const { state } = importInto(emptyState(), backup([legacyTimer('a', { accumulatedMs: 5000 })], null))
    expect(state.entries).toEqual([adjustment('new-1', 'legacy-a', NOW, 5000, LEGACY_IMPORT_NOTE)])
  })

  it('creates a timer with accumulatedMs 0 without entries', () => {
    const { state, imported } = importInto(emptyState(), backup([legacyTimer('a')]))
    expect(imported).toBe(1)
    expect(state.timers).toHaveLength(1)
    expect(state.entries).toEqual([])
  })

  it('reuses "General", placing the timers after the existing ones, and names empty names "Sin nombre"', () => {
    const base = buildState({
      groups: [makeGroup('work'), makeGroup('general', { name: DEFAULT_GROUP_NAME, order: 1 })],
      timers: [makeTimer('mine', 'general', { order: 3 })],
    })
    const { state } = importInto(base, backup([legacyTimer('a', { name: '   ' }), legacyTimer('b', { name: '  Tesis ' })]))
    expect(state.groups).toEqual(base.groups)
    expect(state.timers.slice(1)).toEqual([
      { id: 'legacy-a', groupId: 'general', name: LEGACY_UNNAMED, icon: null, color: DEFAULT_COLOR, order: 4, archivedAt: null, createdAt: NOW },
      { id: 'legacy-b', groupId: 'general', name: 'Tesis', icon: null, color: DEFAULT_COLOR, order: 5, archivedAt: null, createdAt: NOW },
    ])
  })

  it('creates "General" when it does not exist', () => {
    const { state } = importInto(buildState({ groups: [makeGroup('work')] }), backup([legacyTimer('a')]))
    expect(state.groups[1]).toMatchObject({ id: 'new-1', name: DEFAULT_GROUP_NAME, order: 1 })
    expect(state.timers[0].groupId).toBe('new-1')
  })

  it('does not copy the file singleRunning into settings', () => {
    const off = importInto(emptyState(false), parsedFixture())
    expect(off.state.settings).toEqual({ singleRunning: false })
    const on = importInto(emptyState(true), backup([legacyTimer('a')]))
    expect(on.state.settings).toEqual({ singleRunning: true })
  })

  it('with singleRunning on, keeps only the most recent running session open and closes the rest at now', () => {
    const file = backup([legacyTimer('old', { startedAt: NOW - 3 * HOUR }), legacyTimer('new', { startedAt: NOW - HOUR })])
    const { state } = importInto(emptyState(true), file)
    expect(state.entries).toEqual([
      session('new-1', 'legacy-old', NOW - 3 * HOUR, NOW),
      session('new-2', 'legacy-new', NOW - HOUR),
    ])
  })

  it('with singleRunning off, keeps every running session open', () => {
    const file = backup([legacyTimer('old', { startedAt: NOW - 3 * HOUR }), legacyTimer('new', { startedAt: NOW - HOUR })])
    const { state } = importInto(emptyState(false), file)
    expect(getRunningTimerIds(state)).toEqual(['legacy-old', 'legacy-new'])
  })

  it('does not mutate the input state', () => {
    const base = buildState({ timers: [makeTimer('a', 'g1')], entries: [session('s1', 'a', NOW - HOUR)] })
    const snapshot = structuredClone(base)
    importLegacyBackup(base, backup([legacyTimer('b', { startedAt: NOW - 30 * MINUTE, accumulatedMs: 1 })]), NOW, sequentialIds())
    expect(base).toEqual(snapshot)
  })
})
