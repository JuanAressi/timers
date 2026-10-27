import { ensureDefaultGroup, ensureGeneralGroup, nextOrder } from './defaults'
import { enforceSingleRunning, isOpenSession } from './sessions'
import type { Entry, Id, IdFactory, PersistedState, SessionEntry, Timer } from './types'

/** One change made by `repairState`, with the ids it touched. */
export type Repair =
  | { type: 'merged-duplicate'; entity: 'group' | 'timer'; id: Id }
  | { type: 'reassigned-duplicate-id'; previousId: Id; entryId: Id }
  | { type: 'moved-orphan-timer'; timerId: Id; fromGroupId: Id; toGroupId: Id }
  | { type: 'dropped-orphan-entry'; entryId: Id; timerId: Id }
  | { type: 'fixed-session-end'; entryId: Id }
  | { type: 'closed-extra-open-session'; entryId: Id; timerId: Id }
  | { type: 'enforced-single-running'; entryIds: Id[] }
  | { type: 'created-default-group'; groupId: Id }

interface RepairContext {
  now: number
  newId: IdFactory
  repairs: Repair[]
}

/** A repair step returns the same state when it has nothing to fix. */
type RepairStep = (state: PersistedState, context: RepairContext) => PersistedState

/** Keeps the first item of each id, in order. */
function keepFirstById<T extends { id: Id }>(items: readonly T[]): { kept: T[]; discarded: T[] } {
  const seen = new Set<Id>()
  const kept: T[] = []
  const discarded: T[] = []
  for (const item of items) {
    if (seen.has(item.id)) discarded.push(item)
    else kept.push(item)
    seen.add(item.id)
  }
  return { kept, discarded }
}

/** Renumbers the timers of the given groups as 0, 1, 2… keeping their relative order. */
function renumberTimers(timers: readonly Timer[], groupIds: ReadonlySet<Id>): Timer[] {
  const orders = new Map<Timer, number>()
  for (const groupId of groupIds) {
    timers
      .filter((timer) => timer.groupId === groupId)
      .sort((a, b) => a.order - b.order)
      .forEach((timer, index) => orders.set(timer, index))
  }
  return timers.map((timer) => {
    const order = orders.get(timer)
    return order === undefined || order === timer.order ? timer : { ...timer, order }
  })
}

/**
 * Repeated group or timer ids keep the first one. Whatever pointed to that id (timers, entries) now points to the
 * survivor, and the `order` of the affected groups is renumbered. Repeated entry ids get a new id.
 */
const mergeDuplicateIds: RepairStep = (state, { newId, repairs }) => {
  let next = state

  const groups = keepFirstById(next.groups)
  if (groups.discarded.length > 0) {
    const mergedIds = new Set(groups.discarded.map((group) => group.id))
    for (const id of mergedIds) repairs.push({ type: 'merged-duplicate', entity: 'group', id })
    next = { ...next, groups: groups.kept, timers: renumberTimers(next.timers, mergedIds) }
  }

  const timers = keepFirstById(next.timers)
  if (timers.discarded.length > 0) {
    for (const id of new Set(timers.discarded.map((timer) => timer.id))) {
      repairs.push({ type: 'merged-duplicate', entity: 'timer', id })
    }
    // The discarded timers leave a gap in their groups.
    next = { ...next, timers: renumberTimers(timers.kept, new Set(timers.discarded.map((timer) => timer.groupId))) }
  }

  const used = new Set(next.entries.map((entry) => entry.id))
  const seen = new Set<Id>()
  let reassigned = false
  const entries = next.entries.map((entry): Entry => {
    if (!seen.has(entry.id)) {
      seen.add(entry.id)
      return entry
    }
    let id = newId()
    while (used.has(id)) id = newId()
    used.add(id)
    reassigned = true
    repairs.push({ type: 'reassigned-duplicate-id', previousId: entry.id, entryId: id })
    return { ...entry, id }
  })
  return reassigned ? { ...next, entries } : next
}

/** Timers whose group doesn't exist go to the end of "General", which is created if needed. */
const moveOrphanTimers: RepairStep = (state, { now, newId, repairs }) => {
  const groupIds = new Set(state.groups.map((group) => group.id))
  if (state.timers.every((timer) => groupIds.has(timer.groupId))) return state

  const general = ensureGeneralGroup(state, now, newId)
  if (general.created) repairs.push({ type: 'created-default-group', groupId: general.groupId })
  let order = nextOrder(state.timers.filter((timer) => timer.groupId === general.groupId))
  const timers = state.timers.map((timer) => {
    if (groupIds.has(timer.groupId)) return timer
    repairs.push({ type: 'moved-orphan-timer', timerId: timer.id, fromGroupId: timer.groupId, toGroupId: general.groupId })
    return { ...timer, groupId: general.groupId, order: order++ }
  })
  return { ...general.state, timers }
}

/** Entries whose timer doesn't exist are dropped. */
const dropOrphanEntries: RepairStep = (state, { repairs }) => {
  const timerIds = new Set(state.timers.map((timer) => timer.id))
  const orphans = state.entries.filter((entry) => !timerIds.has(entry.timerId))
  if (orphans.length === 0) return state
  for (const entry of orphans) repairs.push({ type: 'dropped-orphan-entry', entryId: entry.id, timerId: entry.timerId })
  return { ...state, entries: state.entries.filter((entry) => timerIds.has(entry.timerId)) }
}

/** A closed session that ends before it starts ends when it starts (invariant 3). */
const fixSessionEnds: RepairStep = (state, { repairs }) => {
  let fixed = false
  const entries = state.entries.map((entry): Entry => {
    if (entry.type !== 'session' || entry.endedAt === null || entry.endedAt >= entry.startedAt) return entry
    fixed = true
    repairs.push({ type: 'fixed-session-end', entryId: entry.id })
    return { ...entry, endedAt: entry.startedAt }
  })
  return fixed ? { ...state, entries } : state
}

/**
 * Only the most recent session of a timer can be open (invariant 1). Every other open session is closed when the
 * next session of that timer starts. Since only the last session lacks a next one, this never needs `now`.
 */
const closeExtraOpenSessions: RepairStep = (state, { repairs }) => {
  const sessionsByTimer = new Map<Id, SessionEntry[]>()
  for (const entry of state.entries) {
    if (entry.type !== 'session') continue
    const sessions = sessionsByTimer.get(entry.timerId) ?? []
    sessions.push(entry)
    sessionsByTimer.set(entry.timerId, sessions)
  }

  const closeAt = new Map<SessionEntry, number>()
  for (const sessions of sessionsByTimer.values()) {
    // `toSorted` is stable, so sessions that start at the same time keep their array order.
    const sorted = sessions.toSorted((a, b) => a.startedAt - b.startedAt)
    sorted.forEach((entry, index) => {
      const following = sorted[index + 1]
      if (entry.endedAt === null && following) closeAt.set(entry, following.startedAt)
    })
  }
  if (closeAt.size === 0) return state

  const entries = state.entries.map((entry): Entry => {
    if (entry.type !== 'session') return entry
    const endedAt = closeAt.get(entry)
    if (endedAt === undefined) return entry
    repairs.push({ type: 'closed-extra-open-session', entryId: entry.id, timerId: entry.timerId })
    return { ...entry, endedAt }
  })
  return { ...state, entries }
}

/** With `singleRunning`, only the most recently started session stays open and the rest close at `now` (invariant 2). */
const enforceSingleRunningSetting: RepairStep = (state, { now, repairs }) => {
  if (!state.settings.singleRunning) return state
  const next = enforceSingleRunning(state, now)
  if (next === state) return state
  const entryIds = state.entries
    .filter((entry, index) => isOpenSession(entry) && !isOpenSession(next.entries[index]))
    .map((entry) => entry.id)
  repairs.push({ type: 'enforced-single-running', entryIds })
  return next
}

/** There is always at least one group (invariant 5). */
const ensureGroupExists: RepairStep = (state, { now, newId, repairs }) => {
  const next = ensureDefaultGroup(state, now, newId)
  if (next !== state) repairs.push({ type: 'created-default-group', groupId: next.groups[0].id })
  return next
}

const REPAIR_STEPS: readonly RepairStep[] = [
  mergeDuplicateIds,
  moveOrphanTimers,
  dropOrphanEntries,
  fixSessionEnds,
  closeExtraOpenSessions,
  enforceSingleRunningSetting,
  ensureGroupExists,
]

/**
 * Fixes the broken invariants of a state that already has a valid shape, and lists what it changed.
 * Returns the same object and `repairs: []` when there is nothing to fix. Repairing a repaired state changes nothing.
 */
export function repairState(
  state: PersistedState,
  now: number,
  newId: IdFactory,
): { state: PersistedState; repairs: Repair[] } {
  const context: RepairContext = { now, newId, repairs: [] }
  const repaired = REPAIR_STEPS.reduce((current, step) => step(current, context), state)
  return { state: repaired, repairs: context.repairs }
}
