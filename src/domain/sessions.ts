import type { Entry, Id, IdFactory, PersistedState, SessionEntry } from './types'

export function isOpenSession(entry: Entry): entry is SessionEntry {
  return entry.type === 'session' && entry.endedAt === null
}

export function getOpenSession(entries: readonly Entry[], timerId: Id): SessionEntry | undefined {
  return entries.find((entry): entry is SessionEntry => isOpenSession(entry) && entry.timerId === timerId)
}

export function isTimerRunning(state: PersistedState, timerId: Id): boolean {
  return getOpenSession(state.entries, timerId) !== undefined
}

export function getRunningTimerIds(state: PersistedState): Id[] {
  return [...new Set(state.entries.filter(isOpenSession).map((session) => session.timerId))]
}

/** Closes a session at `now`, never before it started (invariant 3), even if the clock went backwards. */
function closeSession(session: SessionEntry, now: number): SessionEntry {
  return { ...session, endedAt: Math.max(now, session.startedAt) }
}

function hasTimer(state: PersistedState, timerId: Id): boolean {
  return state.timers.some((timer) => timer.id === timerId)
}

/**
 * Opens a session for the timer. Does nothing if it is already running or doesn't exist.
 * With `singleRunning`, every other open session is closed at the same `now`.
 */
export function startTimer(state: PersistedState, timerId: Id, now: number, newId: IdFactory): PersistedState {
  if (!hasTimer(state, timerId) || isTimerRunning(state, timerId)) return state
  const entries = state.settings.singleRunning
    ? state.entries.map((entry) => (isOpenSession(entry) ? closeSession(entry, now) : entry))
    : state.entries
  const session: SessionEntry = { id: newId(), timerId, type: 'session', startedAt: now, endedAt: null }
  return { ...state, entries: [...entries, session] }
}

/** Closes the timer's open session. Does nothing if it isn't running. */
export function pauseTimer(state: PersistedState, timerId: Id, now: number): PersistedState {
  const open = getOpenSession(state.entries, timerId)
  if (!open) return state
  return {
    ...state,
    entries: state.entries.map((entry) => (entry === open ? closeSession(open, now) : entry)),
  }
}

export function toggleTimer(state: PersistedState, timerId: Id, now: number, newId: IdFactory): PersistedState {
  return isTimerRunning(state, timerId) ? pauseTimer(state, timerId, now) : startTimer(state, timerId, now, newId)
}

/**
 * Leaves only the most recently started session open across the whole app and closes the rest at `now`.
 * Returns the same state when one or no session is open.
 */
export function enforceSingleRunning(state: PersistedState, now: number): PersistedState {
  const open = state.entries.filter(isOpenSession)
  if (open.length <= 1) return state
  const latest = open.reduce((a, b) => (b.startedAt >= a.startedAt ? b : a))
  return {
    ...state,
    entries: state.entries.map((entry) => (isOpenSession(entry) && entry !== latest ? closeSession(entry, now) : entry)),
  }
}
