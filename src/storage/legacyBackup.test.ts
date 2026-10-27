import { describe, expect, it } from 'vitest'
import fixture from './__fixtures__/legacy-backup.json'
import { parseLegacyBackup } from './legacyBackup'

const timer = { id: 'abc', name: 'Proyecto', accumulatedMs: 5000, startedAt: null }

describe('parseLegacyBackup', () => {
  it('accepts the real prototype export, dropping its singleRunning', () => {
    expect(parseLegacyBackup(fixture)).toEqual({
      ok: true,
      value: { exportedAt: fixture.exportedAt, timers: fixture.timers },
    })
  })

  it('accepts a backup without exportedAt', () => {
    expect(parseLegacyBackup({ timers: [timer] })).toEqual({ ok: true, value: { exportedAt: null, timers: [timer] } })
  })

  it('keeps only the known fields of each timer', () => {
    const result = parseLegacyBackup({ timers: [{ ...timer, color: 'red' }] })
    expect(result.ok && result.value.timers).toEqual([timer])
  })

  it('rejects a negative accumulatedMs', () => {
    expect(parseLegacyBackup({ timers: [{ ...timer, accumulatedMs: -1 }] })).toEqual({ ok: false, error: 'timers[0] is invalid' })
  })

  it('rejects a string startedAt', () => {
    expect(parseLegacyBackup({ timers: [{ ...timer, startedAt: '2026-10-24T18:00:00Z' }] }).ok).toBe(false)
  })

  it('rejects an exportedAt that is not a date', () => {
    expect(parseLegacyBackup({ exportedAt: 'ayer', timers: [] })).toEqual({ ok: false, error: 'exportedAt is not a valid date' })
    expect(parseLegacyBackup({ exportedAt: 1792864512345, timers: [] }).ok).toBe(false)
  })

  it('rejects timers that are not an array, and values that are not objects', () => {
    expect(parseLegacyBackup({ timers: { 0: timer } })).toEqual({ ok: false, error: 'timers is not an array' })
    expect(parseLegacyBackup([timer]).ok).toBe(false)
    expect(parseLegacyBackup(null).ok).toBe(false)
  })
})
