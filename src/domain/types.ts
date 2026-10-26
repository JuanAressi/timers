/** Identifier for groups, timers and entries. Usually a UUID; timers imported from the prototype use `legacy-<id>`. */
export type Id = string

/** Generates new ids. Injected like `now`, so domain functions stay pure. */
export type IdFactory = () => Id

export const CURRENT_SCHEMA_VERSION = 1

export interface Group {
  id: Id
  name: string
  /** Lucide icon name, e.g. "code". */
  icon: string | null
  /** Hex color, e.g. "#2f7d5b". */
  color: string
  order: number
  archivedAt: number | null
  createdAt: number
}

export interface Timer {
  id: Id
  groupId: Id
  name: string
  icon: string | null
  color: string
  /** Order within its group. */
  order: number
  archivedAt: number | null
  createdAt: number
}

export interface SessionEntry {
  id: Id
  timerId: Id
  type: 'session'
  startedAt: number
  /** `null` while the session is running. */
  endedAt: number | null
}

export interface AdjustmentEntry {
  id: Id
  timerId: Id
  type: 'adjustment'
  at: number
  deltaMs: number
  note: string | null
}

export type Entry = SessionEntry | AdjustmentEntry

export interface Settings {
  singleRunning: boolean
}

export interface PersistedState {
  schemaVersion: typeof CURRENT_SCHEMA_VERSION
  groups: Group[]
  timers: Timer[]
  entries: Entry[]
  settings: Settings
}

/** Half-open interval `[start, end)` in epoch milliseconds. */
export interface TimeRange {
  start: number
  end: number
}

export type Result<T, E = string> = { ok: true; value: T } | { ok: false; error: E }

export function ok<T>(value: T): Result<T, never> {
  return { ok: true, value }
}

export function err<E>(error: E): Result<never, E> {
  return { ok: false, error }
}
