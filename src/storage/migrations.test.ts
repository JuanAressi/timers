import { describe, expect, it } from 'vitest'
import { buildState } from '../domain/testUtils'
import { migrate, type Migration } from './migrations'

describe('migrate', () => {
  it('passes a v1 state through unchanged', () => {
    const state = buildState()
    expect(migrate(state)).toEqual({ ok: true, value: state })
  })

  it('fails without a version or with an invalid one', () => {
    expect(migrate({ groups: [] }).ok).toBe(false)
    expect(migrate({ schemaVersion: '1' }).ok).toBe(false)
    expect(migrate({ schemaVersion: 0 }).ok).toBe(false)
    expect(migrate(null).ok).toBe(false)
  })

  it('fails with a version newer than the current one', () => {
    expect(migrate({ ...buildState(), schemaVersion: 2 })).toEqual({ ok: false, error: 'schemaVersion 2 is newer than 1' })
  })

  it('chains migrations from the stored version up to the target', () => {
    const migrations: Record<number, Migration> = {
      1: (value) => ({ ...value, renamed: value.old }),
      2: (value) => ({ ...value, steps: 2 }),
    }
    expect(migrate({ schemaVersion: 1, old: 'x' }, migrations, 3)).toEqual({
      ok: true,
      value: { schemaVersion: 3, old: 'x', renamed: 'x', steps: 2 },
    })
    expect(migrate({ schemaVersion: 2 }, migrations, 3)).toEqual({ ok: true, value: { schemaVersion: 3, steps: 2 } })
  })

  it('fails when a step of the chain is missing', () => {
    expect(migrate({ schemaVersion: 1 }, { 2: (value) => value }, 3)).toEqual({
      ok: false,
      error: 'missing migration from schemaVersion 1',
    })
  })
})
