import { formatDuration } from './format'
import { getRunningTimerIds } from './sessions'
import { getTimerTotalMs } from './totals'
import type { PersistedState } from './types'

export const DEFAULT_TITLE = 'Timers'

/**
 * Tab title: total time and name of the first running timer (by group order, then timer order),
 * or "Timers" when none is running. Shows the total, the same number as the timer's row.
 */
export function getDocumentTitle(state: PersistedState, now: number): string {
  const running = new Set(getRunningTimerIds(state))
  if (running.size === 0) return DEFAULT_TITLE
  const groupOrder = new Map(state.groups.map((group) => [group.id, group.order]))
  const first = state.timers
    .filter((timer) => running.has(timer.id))
    .sort((a, b) => (groupOrder.get(a.groupId) ?? 0) - (groupOrder.get(b.groupId) ?? 0) || a.order - b.order)[0]
  if (!first) return DEFAULT_TITLE
  return `${formatDuration(getTimerTotalMs(state, first.id, now))} · ${first.name}`
}
