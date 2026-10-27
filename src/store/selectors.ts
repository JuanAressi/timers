import { DEFAULT_GROUP_NAME } from '../domain/defaults'
import { isTimerRunning } from '../domain/sessions'
import { getDayTotalMs, getTimerTodayMs, getTimerTotalMs } from '../domain/totals'
import type { Group, Id, PersistedState, Timer } from '../domain/types'

// Plain functions over `PersistedState`, so they can be tested without React.
// Components call them with the data and `now` they read from the stores.

function byOrder(a: { order: number }, b: { order: number }): number {
  return a.order - b.order
}

/**
 * The group the timer list shows until groups reach the UI: the active "General", or else the first active group.
 * `ensureDefaultGroup` guarantees there is at least one group, but it could be archived.
 */
export function selectDefaultGroup(data: PersistedState): Group | undefined {
  const active = data.groups.filter((group) => group.archivedAt === null).sort(byOrder)
  return active.find((group) => group.name === DEFAULT_GROUP_NAME) ?? active[0]
}

/** Active timers of a group, by `order`. */
export function selectTimersOfGroup(data: PersistedState, groupId: Id): Timer[] {
  return data.timers.filter((timer) => timer.groupId === groupId && timer.archivedAt === null).sort(byOrder)
}

export interface TimerTimes {
  totalMs: number
  todayMs: number
  running: boolean
}

export function selectTimerTimes(data: PersistedState, timerId: Id, now: number): TimerTimes {
  return {
    totalMs: getTimerTotalMs(data, timerId, now),
    todayMs: getTimerTodayMs(data, timerId, now),
    running: isTimerRunning(data, timerId),
  }
}

export function selectDayTotalMs(data: PersistedState, now: number): number {
  return getDayTotalMs(data, now)
}
