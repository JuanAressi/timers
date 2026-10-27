import { repairState, type Repair } from '../domain/repair'
import { err, ok, type IdFactory, type PersistedState, type Result } from '../domain/types'
import type { KeyValueBackend } from './backend'
import { migrate } from './migrations'
import { parseStateShape } from './validate'

export const STATE_KEY = 'timers.state'
export const CORRUPT_KEY = 'timers.state.corrupt'
export const BACKUP_KEY_PREFIX = 'timers.state.backup-'

/**
 * What `load` found. When a copy couldn't be made (`backedUp: false` or `backupKey: null`), the stored data is left
 * untouched and the caller must block saves, so that nothing overwrites data that only exists there.
 */
export type LoadResult =
  | { kind: 'empty' }
  | { kind: 'loaded'; state: PersistedState }
  /** The original text was copied to `backupKey` and the repaired state was stored. */
  | { kind: 'repaired'; state: PersistedState; repairs: Repair[]; backupKey: string | null }
  /** Unreadable data: copied to a `timers.state.corrupt…` key when `backedUp`. The app starts empty. */
  | { kind: 'corrupt'; backedUp: boolean }
  /** Reading failed (blocked storage, private mode). */
  | { kind: 'unavailable' }

export type SaveError = 'quota' | 'unavailable'

/** Persistence used by the app. It says nothing about `localStorage`, so v1 can implement it on top of SQLite. */
export interface AppStorage {
  load(): LoadResult
  /** Never throws. */
  save(state: PersistedState): Result<void, SaveError>
}

export interface StorageOptions {
  clock: () => number
  newId: IdFactory
}

/** How many numbered variants of a copy key to try before giving up instead of overwriting another copy. */
const MAX_COPY_SUFFIX = 9

const QUOTA_ERROR_NAMES = new Set(['QuotaExceededError', 'NS_ERROR_DOM_QUOTA_REACHED'])

function isQuotaError(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'name' in error && QUOTA_ERROR_NAMES.has(String(error.name))
}

/** `key`, then `key-2`, `key-3`… */
function withSuffixes(key: string): string[] {
  return [key, ...Array.from({ length: MAX_COPY_SUFFIX - 1 }, (_, index) => `${key}-${index + 2}`)]
}

/** Parses, migrates and validates the stored text. Any failure means the data is corrupt. */
function parseStoredState(raw: string): Result<PersistedState, string> {
  let value: unknown
  try {
    value = JSON.parse(raw)
  } catch {
    return err('invalid JSON')
  }
  const migrated = migrate(value)
  return migrated.ok ? parseStateShape(migrated.value) : migrated
}

export function createStorage(backend: KeyValueBackend, { clock, newId }: StorageOptions): AppStorage {
  /**
   * Writes `raw` to the first candidate key that is free, or reuses one that already holds the same text.
   * Never overwrites a different value. Returns the key, or `null` if the copy couldn't be made.
   */
  function keepCopy(candidates: readonly string[], raw: string): string | null {
    try {
      for (const key of candidates) {
        const existing = backend.getItem(key)
        if (existing === raw) return key
        if (existing === null) {
          backend.setItem(key, raw)
          return key
        }
      }
    } catch {
      // Same as running out of keys: there is no copy.
    }
    return null
  }

  function save(state: PersistedState): Result<void, SaveError> {
    try {
      backend.setItem(STATE_KEY, JSON.stringify(state))
      return ok(undefined)
    } catch (error) {
      return err(isQuotaError(error) ? 'quota' : 'unavailable')
    }
  }

  function load(): LoadResult {
    const now = clock()
    let raw: string | null
    try {
      raw = backend.getItem(STATE_KEY)
    } catch {
      return { kind: 'unavailable' }
    }
    if (raw === null) return { kind: 'empty' }

    const parsed = parseStoredState(raw)
    if (!parsed.ok) {
      const copyKey = keepCopy([CORRUPT_KEY, ...withSuffixes(`${CORRUPT_KEY}.${now}`)], raw)
      return { kind: 'corrupt', backedUp: copyKey !== null }
    }

    // `repairState` is pure: nothing is written until the original text is backed up.
    const { state, repairs } = repairState(parsed.value, now, newId)
    if (repairs.length === 0) return { kind: 'loaded', state }
    const backupKey = keepCopy(withSuffixes(`${BACKUP_KEY_PREFIX}${now}`), raw)
    // Storing the repair keeps the next load from repairing and backing up again. If it fails, the next load does.
    if (backupKey !== null) save(state)
    return { kind: 'repaired', state, repairs, backupKey }
  }

  return { load, save }
}
