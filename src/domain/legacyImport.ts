import type { LegacyBackup } from '../storage/legacyBackup'
import { DEFAULT_COLOR, ensureGeneralGroup, nextOrder } from './defaults'
import { enforceSingleRunning } from './sessions'
import type { Entry, IdFactory, PersistedState, Timer } from './types'

export const LEGACY_ID_PREFIX = 'legacy-'
export const LEGACY_IMPORT_NOTE = 'Importado del prototipo'
/** Name the prototype gave to timers left without one. */
export const LEGACY_UNNAMED = 'Sin nombre'

export interface LegacyImportResult {
  state: PersistedState
  /** Timers added. */
  imported: number
  /** Timers that already existed (active or archived) from an earlier import. */
  skipped: number
}

/**
 * Adds the timers of a prototype backup to "General". Each one keeps its time as an adjustment at the export date
 * (or `now` without one) and, if it was running, gets an open session from its `startedAt`.
 * Timers already imported are skipped, so importing the same file twice changes nothing.
 * The file's `singleRunning` is ignored: with the current setting on, only the most recent session stays open.
 */
export function importLegacyBackup(
  state: PersistedState,
  backup: LegacyBackup,
  now: number,
  newId: IdFactory,
): LegacyImportResult {
  const existingIds = new Set(state.timers.map((timer) => timer.id))
  const pending = backup.timers.filter((legacy) => !existingIds.has(LEGACY_ID_PREFIX + legacy.id))
  if (pending.length === 0) return { state, imported: 0, skipped: backup.timers.length }

  const general = ensureGeneralGroup(state, now, newId)
  const adjustmentAt = backup.exportedAt === null ? now : Date.parse(backup.exportedAt)
  let order = nextOrder(state.timers.filter((timer) => timer.groupId === general.groupId))
  const timers: Timer[] = []
  const entries: Entry[] = []
  for (const legacy of pending) {
    const id = LEGACY_ID_PREFIX + legacy.id
    // A repeated id inside the file counts as already imported.
    if (timers.some((timer) => timer.id === id)) continue
    timers.push({
      id,
      groupId: general.groupId,
      name: legacy.name.trim() || LEGACY_UNNAMED,
      icon: null,
      color: DEFAULT_COLOR,
      order: order++,
      archivedAt: null,
      createdAt: now,
    })
    if (legacy.accumulatedMs > 0) {
      entries.push({
        id: newId(),
        timerId: id,
        type: 'adjustment',
        at: adjustmentAt,
        deltaMs: legacy.accumulatedMs,
        note: LEGACY_IMPORT_NOTE,
      })
    }
    if (legacy.startedAt !== null) {
      entries.push({ id: newId(), timerId: id, type: 'session', startedAt: legacy.startedAt, endedAt: null })
    }
  }

  const imported: PersistedState = {
    ...general.state,
    timers: [...general.state.timers, ...timers],
    entries: [...general.state.entries, ...entries],
  }
  return {
    state: imported.settings.singleRunning ? enforceSingleRunning(imported, now) : imported,
    imported: timers.length,
    skipped: backup.timers.length - timers.length,
  }
}
