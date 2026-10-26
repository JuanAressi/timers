import { getTimerTotalMs } from './totals'
import { err, ok, type AdjustmentEntry, type Id, type IdFactory, type PersistedState, type Result } from './types'

/** Limits a negative adjustment so the total can't drop below zero (invariant 4). */
export function clampAdjustment(deltaMs: number, currentTotalMs: number): number {
  // `0 - total` instead of `-total`, so a zero total gives 0 and not -0.
  return Math.max(deltaMs, 0 - currentTotalMs)
}

export interface AdjustmentInput {
  timerId: Id
  deltaMs: number
  note?: string | null
  /** When the adjustment counts. Defaults to `now`; it can be in the past but not in the future. */
  at?: number
}

export type AdjustmentError = 'timer-not-found' | 'future-date' | 'zero-delta'

/**
 * Adds an adjustment, storing the delta already clamped against the total at `now`.
 * Fails if the timer doesn't exist, `at` is in the future or the clamped delta is zero.
 */
export function addAdjustment(
  state: PersistedState,
  input: AdjustmentInput,
  now: number,
  newId: IdFactory,
): Result<PersistedState, AdjustmentError> {
  if (!state.timers.some((timer) => timer.id === input.timerId)) return err('timer-not-found')
  const at = input.at ?? now
  if (at > now) return err('future-date')
  const deltaMs = clampAdjustment(input.deltaMs, getTimerTotalMs(state, input.timerId, now))
  if (deltaMs === 0) return err('zero-delta')
  const entry: AdjustmentEntry = {
    id: newId(),
    timerId: input.timerId,
    type: 'adjustment',
    at,
    deltaMs,
    note: input.note?.trim() || null,
  }
  return ok({ ...state, entries: [...state.entries, entry] })
}
