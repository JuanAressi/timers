import { describe, expect, it } from 'vitest'
import { local } from '../../domain/testUtils'
import { getBackupFilename } from './download'

// The tests run with TZ=Europe/Madrid (src/test/setup.ts).
describe('getBackupFilename', () => {
  it('uses the local date late at night', () => {
    expect(getBackupFilename(local(2026, 10, 20, 23, 30))).toBe('timers-2026-10-20.json')
  })

  it('uses the local date when UTC is still on the previous day', () => {
    const now = local(2026, 10, 21, 0, 30)
    expect(new Date(now).toISOString().slice(0, 10)).toBe('2026-10-20')
    expect(getBackupFilename(now)).toBe('timers-2026-10-21.json')
  })

  it('pads month and day', () => {
    expect(getBackupFilename(local(2026, 1, 5, 12))).toBe('timers-2026-01-05.json')
  })
})
