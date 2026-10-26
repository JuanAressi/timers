import { getDayRange } from './dates'
import type { Id, PersistedState, SessionEntry, TimeRange } from './types'

/** Elapsed time of a session, counting an open one until `now`. Never negative. */
export function getSessionDurationMs(session: SessionEntry, now: number): number {
  return Math.max(0, (session.endedAt ?? now) - session.startedAt)
}

/** Part of a session that falls inside `range`, counting an open one until `now`. */
export function getOverlapMs(session: SessionEntry, range: TimeRange, now: number): number {
  const start = Math.max(session.startedAt, range.start)
  const end = Math.min(session.endedAt ?? now, range.end)
  return Math.max(0, end - start)
}

/** All-time total of a timer: sessions plus adjustments, clamped to zero (invariant 4). */
export function getTimerTotalMs(state: PersistedState, timerId: Id, now: number): number {
  let total = 0
  for (const entry of state.entries) {
    if (entry.timerId !== timerId) continue
    total += entry.type === 'session' ? getSessionDurationMs(entry, now) : entry.deltaMs
  }
  return Math.max(0, total)
}

/**
 * Time of a timer inside `range`: sessions clipped to the range plus adjustments whose `at` falls in it.
 * Not clamped, so it can be negative; summing the days of a range gives its real total.
 */
export function getTimerRangeMs(state: PersistedState, timerId: Id, range: TimeRange, now: number): number {
  let total = 0
  for (const entry of state.entries) {
    if (entry.timerId !== timerId) continue
    if (entry.type === 'session') {
      total += getOverlapMs(entry, range, now)
    } else if (entry.at >= range.start && entry.at < range.end) {
      total += entry.deltaMs
    }
  }
  return total
}

export function getTimerTodayMs(state: PersistedState, timerId: Id, now: number): number {
  return getTimerRangeMs(state, timerId, getDayRange(now), now)
}

function getTimerIdsOfGroup(state: PersistedState, groupId: Id): Id[] {
  return state.timers.filter((timer) => timer.groupId === groupId).map((timer) => timer.id)
}

export function getGroupTotalMs(state: PersistedState, groupId: Id, now: number): number {
  return getTimerIdsOfGroup(state, groupId).reduce((sum, timerId) => sum + getTimerTotalMs(state, timerId, now), 0)
}

export function getGroupRangeMs(state: PersistedState, groupId: Id, range: TimeRange, now: number): number {
  return getTimerIdsOfGroup(state, groupId).reduce(
    (sum, timerId) => sum + getTimerRangeMs(state, timerId, range, now),
    0,
  )
}

/** Today's time across every timer, for the header. */
export function getDayTotalMs(state: PersistedState, now: number): number {
  const range = getDayRange(now)
  return state.timers.reduce((sum, timer) => sum + getTimerRangeMs(state, timer.id, range, now), 0)
}
