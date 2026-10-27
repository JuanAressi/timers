import { err, ok, type Result } from '../domain/types'
import { isFiniteNumber, isRecord } from './validate'

/** A timer as the prototype (`legacy/timers.html`) exported it. */
export interface LegacyTimer {
  id: string
  name: string
  accumulatedMs: number
  /** Epoch ms when it was started, or `null` if it was paused. */
  startedAt: number | null
}

/** The prototype's backup. Its `singleRunning` is left out on purpose: the current setting wins. */
export interface LegacyBackup {
  /** ISO date of the export, or `null` if the file doesn't have one. */
  exportedAt: string | null
  timers: LegacyTimer[]
}

/** Same rules as the prototype's `isValidTimer`. */
function isLegacyTimer(value: unknown): value is LegacyTimer {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.name === 'string' &&
    isFiniteNumber(value.accumulatedMs) &&
    value.accumulatedMs >= 0 &&
    (value.startedAt === null || isFiniteNumber(value.startedAt))
  )
}

function isDateString(value: unknown): value is string {
  return typeof value === 'string' && !Number.isNaN(Date.parse(value))
}

/** Validates an already parsed prototype backup and keeps only the fields the import uses. */
export function parseLegacyBackup(value: unknown): Result<LegacyBackup, string> {
  if (!isRecord(value)) return err('backup is not an object')
  const { exportedAt, timers } = value
  if (!(exportedAt === undefined || isDateString(exportedAt))) return err('exportedAt is not a valid date')
  if (!Array.isArray(timers)) return err('timers is not an array')
  const parsed: LegacyTimer[] = []
  for (const [index, timer] of (timers as unknown[]).entries()) {
    if (!isLegacyTimer(timer)) return err(`timers[${index}] is invalid`)
    parsed.push({ id: timer.id, name: timer.name, accumulatedMs: timer.accumulatedMs, startedAt: timer.startedAt })
  }
  return ok({ exportedAt: exportedAt ?? null, timers: parsed })
}
