import {
  CURRENT_SCHEMA_VERSION,
  err,
  ok,
  type Entry,
  type Group,
  type PersistedState,
  type Result,
  type Settings,
  type Timer,
} from '../domain/types'

// Shape checks for data read from outside (storage, files). They don't check relations between entities:
// orphan entries or missing groups have a valid shape and are fixed by `repairState`.

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function isStringOrNull(value: unknown): value is string | null {
  return value === null || typeof value === 'string'
}

function isFiniteNumberOrNull(value: unknown): value is number | null {
  return value === null || isFiniteNumber(value)
}

const HEX_COLOR = /^#[0-9a-f]{6}$/i

function isHexColor(value: unknown): value is string {
  return typeof value === 'string' && HEX_COLOR.test(value)
}

/** Fields shared by groups and timers. */
function hasDisplayFields(value: Record<string, unknown>): boolean {
  return (
    typeof value.id === 'string' &&
    typeof value.name === 'string' &&
    isStringOrNull(value.icon) &&
    isHexColor(value.color) &&
    isFiniteNumber(value.order) &&
    isFiniteNumberOrNull(value.archivedAt) &&
    isFiniteNumber(value.createdAt)
  )
}

export function isGroup(value: unknown): value is Group {
  return isRecord(value) && hasDisplayFields(value)
}

export function isTimer(value: unknown): value is Timer {
  return isRecord(value) && hasDisplayFields(value) && typeof value.groupId === 'string'
}

export function isEntry(value: unknown): value is Entry {
  if (!isRecord(value) || typeof value.id !== 'string' || typeof value.timerId !== 'string') return false
  switch (value.type) {
    case 'session':
      return isFiniteNumber(value.startedAt) && isFiniteNumberOrNull(value.endedAt)
    case 'adjustment':
      return isFiniteNumber(value.at) && isFiniteNumber(value.deltaMs) && isStringOrNull(value.note)
    default:
      return false
  }
}

export function isSettings(value: unknown): value is Settings {
  return isRecord(value) && typeof value.singleRunning === 'boolean'
}

/** First invalid item of a list, as an error message, or `null` if all are valid. */
function findInvalid(name: string, value: unknown, isValid: (item: unknown) => boolean): string | null {
  if (!Array.isArray(value)) return `${name} is not an array`
  const index = value.findIndex((item) => !isValid(item))
  return index === -1 ? null : `${name}[${index}] is invalid`
}

/** Checks that a parsed value has the shape of the current `PersistedState`. Error messages are for debugging. */
export function parseStateShape(value: unknown): Result<PersistedState, string> {
  if (!isRecord(value)) return err('state is not an object')
  if (value.schemaVersion !== CURRENT_SCHEMA_VERSION) return err(`unsupported schemaVersion ${String(value.schemaVersion)}`)
  const error =
    findInvalid('groups', value.groups, isGroup) ??
    findInvalid('timers', value.timers, isTimer) ??
    findInvalid('entries', value.entries, isEntry) ??
    (isSettings(value.settings) ? null : 'settings are invalid')
  return error === null ? ok(value as unknown as PersistedState) : err(error)
}
