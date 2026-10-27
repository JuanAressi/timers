import { enforceSingleRunning } from './sessions'
import type { PersistedState } from './types'

/**
 * Turns "only one running at a time" on or off. Turning it on leaves running only the most recently started timer
 * and pauses the rest at `now` (invariant 2). Returns the same state if the value doesn't change.
 */
export function setSingleRunning(state: PersistedState, value: boolean, now: number): PersistedState {
  if (state.settings.singleRunning === value) return state
  const updated = { ...state, settings: { ...state.settings, singleRunning: value } }
  return value ? enforceSingleRunning(updated, now) : updated
}
