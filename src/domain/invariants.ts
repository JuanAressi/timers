import { isOpenSession } from './sessions'
import type { Id, PersistedState } from './types'

function findDuplicates(ids: readonly Id[]): Id[] {
  const seen = new Set<Id>()
  const duplicates = new Set<Id>()
  for (const id of ids) {
    if (seen.has(id)) duplicates.add(id)
    seen.add(id)
  }
  return [...duplicates]
}

/**
 * Lists the broken invariants of a state that already has a valid shape (see docs/architecture.md).
 * Covers the ones `repairState` fixes: unique ids, references between entities and invariants 1, 2, 3 and 5.
 * Invariant 4 is enforced when adjustments are created, and 6 and 7 are about actions, not data.
 * Messages are for debugging, not for the UI.
 */
export function findInvariantViolations(state: PersistedState): string[] {
  const violations: string[] = []

  for (const id of findDuplicates(state.groups.map((group) => group.id))) violations.push(`duplicate group id ${id}`)
  for (const id of findDuplicates(state.timers.map((timer) => timer.id))) violations.push(`duplicate timer id ${id}`)
  for (const id of findDuplicates(state.entries.map((entry) => entry.id))) violations.push(`duplicate entry id ${id}`)

  if (state.groups.length === 0) violations.push('there are no groups')
  const groupIds = new Set(state.groups.map((group) => group.id))
  for (const timer of state.timers) {
    if (!groupIds.has(timer.groupId)) violations.push(`timer ${timer.id} belongs to missing group ${timer.groupId}`)
  }

  const timerIds = new Set(state.timers.map((timer) => timer.id))
  for (const entry of state.entries) {
    if (!timerIds.has(entry.timerId)) violations.push(`entry ${entry.id} belongs to missing timer ${entry.timerId}`)
    if (entry.type === 'session' && entry.endedAt !== null && entry.endedAt < entry.startedAt) {
      violations.push(`session ${entry.id} ends before it starts`)
    }
  }

  const open = state.entries.filter(isOpenSession)
  for (const timerId of findDuplicates(open.map((entry) => entry.timerId))) {
    violations.push(`timer ${timerId} has more than one open session`)
  }
  for (const entry of open) {
    const later = state.entries.find(
      (other) => other.type === 'session' && other !== entry && other.timerId === entry.timerId && other.startedAt > entry.startedAt,
    )
    if (later) violations.push(`open session ${entry.id} is followed by session ${later.id}`)
  }
  if (state.settings.singleRunning && open.length > 1) violations.push('more than one open session with singleRunning')

  return violations
}
