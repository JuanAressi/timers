import type { PersistedState } from '../domain/types'

/** Marks a file as a backup of this app, so the import can tell it apart from the prototype's. */
export const BACKUP_APP_ID = 'timers'

/** The full state as an indented JSON backup: `{ app: 'timers', exportedAt: ISO, ...state }`. */
export function serializeBackup(state: PersistedState, now: number): string {
  return JSON.stringify({ app: BACKUP_APP_ID, exportedAt: new Date(now).toISOString(), ...state }, null, 2)
}
