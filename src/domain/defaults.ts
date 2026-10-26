import { CURRENT_SCHEMA_VERSION, type Group, type IdFactory, type PersistedState, type Settings } from './types'

export const DEFAULT_GROUP_NAME = 'General'
/** Accent color of the prototype. The curated palette arrives with the icon and color pickers. */
export const DEFAULT_COLOR = '#2f7d5b'
export const DEFAULT_SETTINGS: Settings = { singleRunning: true }

function createDefaultGroup(now: number, newId: IdFactory, order: number): Group {
  return {
    id: newId(),
    name: DEFAULT_GROUP_NAME,
    icon: null,
    color: DEFAULT_COLOR,
    order,
    archivedAt: null,
    createdAt: now,
  }
}

/** Empty state with the "General" group. */
export function createInitialState(now: number, newId: IdFactory): PersistedState {
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    groups: [createDefaultGroup(now, newId, 0)],
    timers: [],
    entries: [],
    settings: { ...DEFAULT_SETTINGS },
  }
}

/** Guarantees at least one group exists by creating "General" when there are none. */
export function ensureDefaultGroup(state: PersistedState, now: number, newId: IdFactory): PersistedState {
  if (state.groups.length > 0) return state
  return { ...state, groups: [createDefaultGroup(now, newId, 0)] }
}
