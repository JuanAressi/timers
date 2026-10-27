import { describe, expect, it } from 'vitest'
import { adjustment, buildState, local, makeTimer, session } from '../domain/testUtils'
import { BACKUP_APP_ID, serializeBackup } from './backup'

const NOW = local(2026, 10, 26, 13)

const state = buildState({
  timers: [makeTimer('a', 'g1')],
  entries: [session('s1', 'a', NOW - 60_000), adjustment('j1', 'a', NOW - 1000, 5000, 'nota')],
})

describe('serializeBackup', () => {
  it('adds the app id and the export date as ISO', () => {
    const backup = JSON.parse(serializeBackup(state, NOW)) as Record<string, unknown>
    expect(backup.app).toBe(BACKUP_APP_ID)
    expect(backup.exportedAt).toBe(new Date(NOW).toISOString())
  })

  it('without those two fields, the rest is the state', () => {
    const { app, exportedAt, ...rest } = JSON.parse(serializeBackup(state, NOW)) as Record<string, unknown>
    expect([app, exportedAt]).not.toContain(undefined)
    expect(rest).toEqual(state)
  })

  it('is indented', () => {
    expect(serializeBackup(state, NOW)).toContain('\n  "app": "timers"')
  })
})
