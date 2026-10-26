import { DEFAULT_COLOR } from './defaults'
import {
  CURRENT_SCHEMA_VERSION,
  type AdjustmentEntry,
  type Group,
  type Id,
  type IdFactory,
  type PersistedState,
  type SessionEntry,
  type Timer,
} from './types'

// Helpers to build small states in tests. Not used by the app.

export const MINUTE = 60_000
export const HOUR = 60 * MINUTE

/** Epoch ms of a local date; `month` is 1-based. */
export function local(year: number, month: number, day: number, hours = 0, minutes = 0): number {
  return new Date(year, month - 1, day, hours, minutes).getTime()
}

export function sequentialIds(prefix = 'id'): IdFactory {
  let count = 0
  return () => `${prefix}-${++count}`
}

export function makeGroup(id: Id, overrides: Partial<Group> = {}): Group {
  return { id, name: id, icon: null, color: DEFAULT_COLOR, order: 0, archivedAt: null, createdAt: 0, ...overrides }
}

export function makeTimer(id: Id, groupId: Id, overrides: Partial<Timer> = {}): Timer {
  return { id, groupId, name: id, icon: null, color: DEFAULT_COLOR, order: 0, archivedAt: null, createdAt: 0, ...overrides }
}

export function session(id: Id, timerId: Id, startedAt: number, endedAt: number | null = null): SessionEntry {
  return { id, timerId, type: 'session', startedAt, endedAt }
}

export function adjustment(id: Id, timerId: Id, at: number, deltaMs: number, note: string | null = null): AdjustmentEntry {
  return { id, timerId, type: 'adjustment', at, deltaMs, note }
}

/** A state with group "g1" and the given timers and entries. */
export function buildState(partial: Partial<Omit<PersistedState, 'schemaVersion'>> = {}): PersistedState {
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    groups: [makeGroup('g1')],
    timers: [],
    entries: [],
    settings: { singleRunning: true },
    ...partial,
  }
}
