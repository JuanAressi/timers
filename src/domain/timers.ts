import { DEFAULT_COLOR, nextOrder } from './defaults'
import { err, ok, type Id, type IdFactory, type PersistedState, type Result, type Timer } from './types'

export const MAX_TIMER_NAME_LENGTH = 80
/** Name given to a timer left without one, as the prototype did. */
export const UNNAMED_TIMER = 'Sin nombre'

/** Trims the name and cuts it to the maximum length. May return an empty string. */
function cleanName(name: string): string {
  return name.trim().slice(0, MAX_TIMER_NAME_LENGTH).trim()
}

/** The name `renameTimer` stores for `name`. Lets the UI show it without waiting for the store. */
export function normalizeTimerName(name: string): string {
  return cleanName(name) || UNNAMED_TIMER
}

/** Adds a timer at the end of its group. Fails if the name is empty or the group doesn't exist. */
export function addTimer(
  state: PersistedState,
  { groupId, name }: { groupId: Id; name: string },
  now: number,
  newId: IdFactory,
): Result<PersistedState> {
  const cleaned = cleanName(name)
  if (cleaned === '') return err('empty name')
  if (!state.groups.some((group) => group.id === groupId)) return err('group not found')
  const timer: Timer = {
    id: newId(),
    groupId,
    name: cleaned,
    icon: null,
    color: DEFAULT_COLOR,
    order: nextOrder(state.timers.filter((other) => other.groupId === groupId)),
    archivedAt: null,
    createdAt: now,
  }
  return ok({ ...state, timers: [...state.timers, timer] })
}

/** Renames a timer; an empty name becomes "Sin nombre". Returns the same state if nothing changes. */
export function renameTimer(state: PersistedState, timerId: Id, name: string): PersistedState {
  const normalized = normalizeTimerName(name)
  const current = state.timers.find((timer) => timer.id === timerId)
  if (!current || current.name === normalized) return state
  return {
    ...state,
    timers: state.timers.map((timer) => (timer === current ? { ...timer, name: normalized } : timer)),
  }
}
