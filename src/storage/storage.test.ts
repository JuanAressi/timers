import { describe, expect, it } from 'vitest'
import { createInitialState } from '../domain/defaults'
import { adjustment, buildState, local, makeGroup, makeTimer, sequentialIds, session } from '../domain/testUtils'
import type { PersistedState } from '../domain/types'
import { createMemoryBackend, type KeyValueBackend, type MemoryBackend } from './backend'
import { BACKUP_KEY_PREFIX, CORRUPT_KEY, createStorage, STATE_KEY } from './storage'

const NOW = local(2026, 10, 26, 13)
const BACKUP_KEY = `${BACKUP_KEY_PREFIX}${NOW}`

interface FailureOptions {
  failRead?: boolean
  failWrite?: (key: string) => boolean
  error?: unknown
}

/** Wraps a memory backend to make it throw and to record the order of writes. */
function withFailures(memory: MemoryBackend, { failRead = false, failWrite = () => false, error = new Error('boom') }: FailureOptions) {
  const writes: string[] = []
  const backend: KeyValueBackend = {
    getItem: (key) => {
      if (failRead) throw error
      return memory.getItem(key)
    },
    setItem: (key, value) => {
      if (failWrite(key)) throw error
      writes.push(key)
      memory.setItem(key, value)
    },
    removeItem: (key) => memory.removeItem(key),
  }
  return { backend, writes }
}

function setup(initial: Record<string, string> = {}, failures: FailureOptions = {}) {
  const memory = createMemoryBackend(initial)
  const { backend, writes } = withFailures(memory, failures)
  const storage = createStorage(backend, { clock: () => NOW, newId: sequentialIds('new') })
  return { memory, writes, storage }
}

const validState = buildState({
  timers: [makeTimer('a', 'g1')],
  entries: [session('s1', 'a', NOW - 7_200_000, NOW - 3_600_000), session('s2', 'a', NOW - 60_000)],
})

/** Valid shape, but with an entry of a timer that doesn't exist. */
const orphanEntryState = buildState({
  timers: [makeTimer('a', 'g1')],
  entries: [session('s1', 'a', NOW - 60_000), adjustment('x', 'gone', NOW - 60_000, 5000)],
})

describe('load', () => {
  it('returns empty when nothing is stored', () => {
    const { storage, writes } = setup()
    expect(storage.load()).toEqual({ kind: 'empty' })
    expect(writes).toEqual([])
  })

  it('returns a valid state as loaded, without writing', () => {
    const { storage, writes } = setup({ [STATE_KEY]: JSON.stringify(validState) })
    expect(storage.load()).toEqual({ kind: 'loaded', state: validState })
    expect(writes).toEqual([])
  })

  it('returns unavailable when reading throws', () => {
    const { storage } = setup({ [STATE_KEY]: JSON.stringify(validState) }, { failRead: true })
    expect(storage.load()).toEqual({ kind: 'unavailable' })
  })

  describe('corrupt data', () => {
    it.each([
      ['broken JSON syntax', '{'],
      ['a JSON with the wrong shape', JSON.stringify({ ...validState, timers: 'nope' })],
      ['a JSON array', '[]'],
      ['a JSON without schemaVersion', JSON.stringify({ groups: [], timers: [], entries: [] })],
      ['a newer schemaVersion', JSON.stringify({ ...validState, schemaVersion: 2 })],
    ])('copies %s to timers.state.corrupt and leaves timers.state untouched', (_, raw) => {
      const { storage, memory, writes } = setup({ [STATE_KEY]: raw })
      expect(storage.load()).toEqual({ kind: 'corrupt', backedUp: true })
      expect(memory.dump()).toEqual({ [STATE_KEY]: raw, [CORRUPT_KEY]: raw })
      expect(writes).toEqual([CORRUPT_KEY])
    })

    it('keeps the copy when the app then starts empty and saves over timers.state', () => {
      const { storage, memory } = setup({ [STATE_KEY]: '{' })
      expect(storage.load().kind).toBe('corrupt')
      expect(storage.save(createInitialState(NOW, sequentialIds()))).toEqual({ ok: true, value: undefined })
      expect(memory.getItem(CORRUPT_KEY)).toBe('{')
    })

    it('does not overwrite a different earlier copy: uses timers.state.corrupt.<epoch>', () => {
      const { storage, memory } = setup({ [STATE_KEY]: '{', [CORRUPT_KEY]: 'older' })
      expect(storage.load()).toEqual({ kind: 'corrupt', backedUp: true })
      expect(memory.dump()).toEqual({ [STATE_KEY]: '{', [CORRUPT_KEY]: 'older', [`${CORRUPT_KEY}.${NOW}`]: '{' })
    })

    it('reuses an identical earlier copy instead of writing another', () => {
      const { storage, writes } = setup({ [STATE_KEY]: '{', [CORRUPT_KEY]: '{' })
      expect(storage.load()).toEqual({ kind: 'corrupt', backedUp: true })
      expect(writes).toEqual([])
    })

    it('reports backedUp: false, so saves get blocked, when the copy fails', () => {
      const { storage, memory, writes } = setup({ [STATE_KEY]: '{' }, { failWrite: () => true })
      expect(storage.load()).toEqual({ kind: 'corrupt', backedUp: false })
      expect(memory.dump()).toEqual({ [STATE_KEY]: '{' })
      expect(writes).toEqual([])
    })
  })

  describe('repairable data', () => {
    it('backs up the original text before storing the repaired state', () => {
      const raw = JSON.stringify(orphanEntryState)
      const { storage, memory, writes } = setup({ [STATE_KEY]: raw })
      const repaired = { ...orphanEntryState, entries: [session('s1', 'a', NOW - 60_000)] }

      expect(storage.load()).toEqual({
        kind: 'repaired',
        state: repaired,
        repairs: [{ type: 'dropped-orphan-entry', entryId: 'x', timerId: 'gone' }],
        backupKey: BACKUP_KEY,
      })
      expect(writes).toEqual([BACKUP_KEY, STATE_KEY])
      expect(memory.getItem(BACKUP_KEY)).toBe(raw)
      expect(JSON.parse(memory.getItem(STATE_KEY) ?? '')).toEqual(repaired)
    })

    it('when the backup fails, repairs nothing in storage, saves nothing and reports backupKey: null so saves get blocked', () => {
      const raw = JSON.stringify(orphanEntryState)
      const { storage, memory, writes } = setup({ [STATE_KEY]: raw }, { failWrite: (key) => key.startsWith(BACKUP_KEY_PREFIX) })
      const result = storage.load()

      expect(result).toMatchObject({ kind: 'repaired', backupKey: null })
      expect(writes).toEqual([])
      expect(memory.dump()).toEqual({ [STATE_KEY]: raw })
    })

    it('does not overwrite a different backup with the same timestamp', () => {
      const raw = JSON.stringify(orphanEntryState)
      const { storage, memory } = setup({ [STATE_KEY]: raw, [BACKUP_KEY]: 'other' })
      expect(storage.load()).toMatchObject({ kind: 'repaired', backupKey: `${BACKUP_KEY}-2` })
      expect(memory.getItem(BACKUP_KEY)).toBe('other')
      expect(memory.getItem(`${BACKUP_KEY}-2`)).toBe(raw)
    })

    it('keeps the original in timers.state when storing the repaired state fails', () => {
      const raw = JSON.stringify(orphanEntryState)
      const { storage, memory } = setup({ [STATE_KEY]: raw }, { failWrite: (key) => key === STATE_KEY })
      expect(storage.load()).toMatchObject({ kind: 'repaired', backupKey: BACKUP_KEY })
      expect(memory.dump()).toEqual({ [STATE_KEY]: raw, [BACKUP_KEY]: raw })
    })

    it('load, repair and load again gives the same state, without another backup', () => {
      const broken = buildState({
        groups: [makeGroup('g1'), makeGroup('g1')],
        timers: [makeTimer('a', 'g1'), makeTimer('b', 'gone')],
        entries: [session('s1', 'a', NOW - 60_000), session('s1', 'b', NOW - 30_000), session('s2', 'a', NOW, NOW - 1)],
      })
      const { storage, memory } = setup({ [STATE_KEY]: JSON.stringify(broken) })
      const first = storage.load()
      expect(first.kind).toBe('repaired')
      const keysAfterRepair = Object.keys(memory.dump())

      const second = storage.load()
      expect(second).toEqual({ kind: 'loaded', state: first.kind === 'repaired' ? first.state : null })
      expect(Object.keys(memory.dump())).toEqual(keysAfterRepair)
    })
  })
})

describe('save', () => {
  it('stores JSON that load reads back equal', () => {
    const { storage } = setup()
    const state: PersistedState = { ...validState, settings: { singleRunning: false } }
    expect(storage.save(state)).toEqual({ ok: true, value: undefined })
    expect(storage.load()).toEqual({ kind: 'loaded', state })
  })

  it('returns quota without throwing when the storage is full', () => {
    const { storage } = setup({}, { failWrite: () => true, error: new DOMException('full', 'QuotaExceededError') })
    expect(storage.save(validState)).toEqual({ ok: false, error: 'quota' })
  })

  it('returns unavailable without throwing on any other error', () => {
    const { storage } = setup({}, { failWrite: () => true, error: new DOMException('denied', 'SecurityError') })
    expect(storage.save(validState)).toEqual({ ok: false, error: 'unavailable' })
  })
})

describe('createStorage', () => {
  it('exposes only load and save', () => {
    expect(Object.keys(setup().storage)).toEqual(['load', 'save'])
  })
})
