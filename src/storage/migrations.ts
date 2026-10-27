import { CURRENT_SCHEMA_VERSION, err, ok, type Result } from '../domain/types'
import { isRecord } from './validate'

/** Turns a persisted value of version `n` into version `n + 1`. It receives data whose shape isn't validated yet. */
export type Migration = (value: Record<string, unknown>) => Record<string, unknown>

/** `MIGRATIONS[n]` migrates from version `n` to `n + 1`. Version 1 is the first one, so there are none yet. */
export const MIGRATIONS: Readonly<Record<number, Migration>> = {}

/**
 * Brings a parsed value up to `targetVersion` by chaining migrations from its `schemaVersion`.
 * Fails without a version, with a version newer than the target or when a step is missing.
 * Only the version is checked here; the shape is validated afterwards.
 */
export function migrate(
  value: unknown,
  migrations: Readonly<Record<number, Migration>> = MIGRATIONS,
  targetVersion: number = CURRENT_SCHEMA_VERSION,
): Result<unknown, string> {
  if (!isRecord(value)) return err('state is not an object')
  const version = value.schemaVersion
  if (typeof version !== 'number' || !Number.isInteger(version) || version < 1) {
    return err(`invalid schemaVersion ${String(version)}`)
  }
  if (version > targetVersion) return err(`schemaVersion ${version} is newer than ${targetVersion}`)

  let current = value
  for (let from = version; from < targetVersion; from++) {
    const step = migrations[from]
    if (!step) return err(`missing migration from schemaVersion ${from}`)
    current = { ...step(current), schemaVersion: from + 1 }
  }
  return ok(current)
}
