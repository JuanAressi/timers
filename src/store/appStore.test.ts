import { describe, expect, it } from 'vitest'
import fixture from '../storage/__fixtures__/legacy-backup.json'
import { DEFAULT_GROUP_NAME } from '../domain/defaults'
import { findInvariantViolations } from '../domain/invariants'
import { adjustment, buildState, local, makeTimer, MINUTE, sequentialIds, session } from '../domain/testUtils'
import type { PersistedState } from '../domain/types'
import { createMemoryBackend, type KeyValueBackend } from '../storage/backend'
import { parseLegacyBackup, type LegacyBackup } from '../storage/legacyBackup'
import { createStorage, STATE_KEY } from '../storage/storage'
import { createAppStore } from './appStore'
import { syncWithOtherTabs } from './tabSync'

const START = local(2026, 10, 26, 10)

interface SetupOptions {
  /** Makes `setItem` throw for the keys it returns `true` for. */
  failWrite?: (key: string) => boolean
}

/** A store over a memory backend with a fake clock. `writes` records every key written after the store loaded. */
function setup(initial: Record<string, string> = {}, { failWrite = () => false }: SetupOptions = {}) {
  const memory = createMemoryBackend(initial)
  const writes: string[] = []
  let failing = failWrite
  const backend: KeyValueBackend = {
    getItem: (key) => memory.getItem(key),
    setItem: (key, value) => {
      if (failing(key)) throw new Error('boom')
      writes.push(key)
      memory.setItem(key, value)
    },
    removeItem: (key) => memory.removeItem(key),
    subscribe: (listener) => memory.subscribe(listener),
  }
  const clock = { now: START }
  const newId = sequentialIds('id')
  const storage = createStorage(backend, { clock: () => clock.now, newId })
  const store = createAppStore({ storage, clock: () => clock.now, newId })
  writes.length = 0
  return {
    store,
    storage,
    memory,
    clock,
    writes,
    setFailWrite: (fn: (key: string) => boolean) => {
      failing = fn
    },
    stored: () => JSON.parse(memory.getItem(STATE_KEY) ?? 'null') as unknown,
  }
}

function groupId(data: PersistedState): string {
  const group = data.groups[0]
  if (!group) throw new Error('no group')
  return group.id
}

function addTwo(store: ReturnType<typeof setup>['store']): [string, string] {
  const { addTimer } = store.getState()
  const id = groupId(store.getState().data)
  addTimer({ groupId: id, name: 'A' })
  addTimer({ groupId: id, name: 'B' })
  const [a, b] = store.getState().data.timers
  if (!a || !b) throw new Error('timers not added')
  return [a.id, b.id]
}

const validState = buildState({
  timers: [makeTimer('a', 'g1', { name: 'Proyecto' })],
  entries: [session('s1', 'a', START - 2 * MINUTE, START - MINUTE)],
})

/** Valid shape, but with an entry of a timer that doesn't exist: `load` repairs it. */
const orphanEntryState = buildState({
  timers: [makeTimer('a', 'g1')],
  entries: [adjustment('x', 'gone', START - MINUTE, 5000)],
})

describe('createAppStore: loading', () => {
  it('creates "General" when the backend is empty', () => {
    const { store, writes } = setup()
    const { data, storageStatus, saveBlocked } = store.getState()
    expect(data.groups.map((group) => group.name)).toEqual([DEFAULT_GROUP_NAME])
    expect(data.timers).toEqual([])
    expect(storageStatus).toBe('ok')
    expect(saveBlocked).toBe(false)
    expect(writes).toEqual([])
  })

  it('keeps valid stored data', () => {
    const { store } = setup({ [STATE_KEY]: JSON.stringify(validState) })
    expect(store.getState().data).toEqual(validState)
    expect(store.getState().storageStatus).toBe('ok')
  })

  it('uses the repaired state when the backup worked', () => {
    const { store } = setup({ [STATE_KEY]: JSON.stringify(orphanEntryState) })
    expect(store.getState().data.entries).toEqual([])
    expect(store.getState().storageStatus).toBe('repaired')
    expect(store.getState().saveBlocked).toBe(false)
  })

  it('starts empty with corrupt data that was backed up, and saves normally', () => {
    const { store, writes } = setup({ [STATE_KEY]: '{' })
    expect(store.getState().storageStatus).toBe('corrupt')
    expect(store.getState().saveBlocked).toBe(false)
    store.getState().addTimer({ groupId: groupId(store.getState().data), name: 'A' })
    expect(writes).toEqual([STATE_KEY])
    // The load notice stays after a successful save.
    expect(store.getState().storageStatus).toBe('corrupt')
  })

  it('blocks saves with corrupt data that could not be backed up', () => {
    const { store, memory, writes } = setup({ [STATE_KEY]: '{' }, { failWrite: (key) => key !== STATE_KEY })
    expect(store.getState().storageStatus).toBe('corrupt')
    expect(store.getState().saveBlocked).toBe(true)

    const [a] = addTwo(store)
    store.getState().renameTimer(a, 'Otro')
    store.getState().toggleTimer(a)

    expect(store.getState().data.timers).toHaveLength(2)
    expect(writes).toEqual([])
    expect(memory.getItem(STATE_KEY)).toBe('{')
  })

  it('blocks saves when the repaired data could not be backed up', () => {
    const raw = JSON.stringify(orphanEntryState)
    const { store, memory, writes } = setup({ [STATE_KEY]: raw }, { failWrite: (key) => key !== STATE_KEY })
    expect(store.getState().storageStatus).toBe('repaired')
    expect(store.getState().saveBlocked).toBe(true)

    store.getState().toggleTimer('a')

    expect(writes).toEqual([])
    expect(memory.getItem(STATE_KEY)).toBe(raw)
  })

  it('starts empty when storage is unavailable', () => {
    const memory = createMemoryBackend()
    const backend: KeyValueBackend = {
      ...memory,
      getItem: () => {
        throw new Error('blocked')
      },
    }
    const newId = sequentialIds('id')
    const store = createAppStore({ storage: createStorage(backend, { clock: () => START, newId }), clock: () => START, newId })
    expect(store.getState().storageStatus).toBe('unavailable')
    expect(store.getState().saveBlocked).toBe(false)
    expect(store.getState().data.groups).toHaveLength(1)
  })
})

describe('createAppStore: actions', () => {
  it('addTimer saves, and the backend holds the same data', () => {
    const { store, stored } = setup()
    expect(store.getState().addTimer({ groupId: groupId(store.getState().data), name: ' Proyecto 1 ' })).toBe(true)
    expect(store.getState().data.timers.map((timer) => timer.name)).toEqual(['Proyecto 1'])
    expect(stored()).toEqual(store.getState().data)
  })

  it('addTimer with an empty name does nothing and returns false', () => {
    const { store, writes } = setup()
    const before = store.getState().data
    expect(store.getState().addTimer({ groupId: groupId(before), name: '   ' })).toBe(false)
    expect(store.getState().data).toBe(before)
    expect(writes).toEqual([])
  })

  it('toggleTimer twice leaves a closed session as long as the clock moved', () => {
    const { store, clock, stored } = setup()
    const [a] = addTwo(store)
    store.getState().toggleTimer(a)
    clock.now += 90_000
    store.getState().toggleTimer(a)
    expect(store.getState().data.entries).toEqual([
      { id: expect.any(String), timerId: a, type: 'session', startedAt: START, endedAt: START + 90_000 },
    ])
    expect(stored()).toEqual(store.getState().data)
  })

  it('with singleRunning, starting B pauses A', () => {
    const { store, clock } = setup()
    const [a, b] = addTwo(store)
    store.getState().toggleTimer(a)
    clock.now += 1000
    store.getState().toggleTimer(b)
    const sessions = store.getState().data.entries
    expect(sessions).toEqual([
      expect.objectContaining({ timerId: a, startedAt: START, endedAt: START + 1000 }),
      expect.objectContaining({ timerId: b, startedAt: START + 1000, endedAt: null }),
    ])
  })

  it('renameTimer saves the normalized name, and an unchanged name does not save', () => {
    const { store, writes, stored } = setup()
    const [a] = addTwo(store)
    store.getState().renameTimer(a, '   ')
    expect(store.getState().data.timers[0]?.name).toBe('Sin nombre')
    expect(stored()).toEqual(store.getState().data)
    writes.length = 0
    store.getState().renameTimer(a, 'Sin nombre')
    expect(writes).toEqual([])
  })

  it('when save fails, the status is save-failed and the state changes anyway', () => {
    const { store, setFailWrite } = setup()
    setFailWrite(() => true)
    store.getState().addTimer({ groupId: groupId(store.getState().data), name: 'A' })
    expect(store.getState().storageStatus).toBe('save-failed')
    expect(store.getState().data.timers).toHaveLength(1)

    setFailWrite(() => false)
    store.getState().addTimer({ groupId: groupId(store.getState().data), name: 'B' })
    expect(store.getState().storageStatus).toBe('ok')
  })
})

function legacyFixture(): LegacyBackup {
  const parsed = parseLegacyBackup(fixture)
  if (!parsed.ok) throw new Error(parsed.error)
  return parsed.value
}

describe('createAppStore: parity actions', () => {
  it('deleteTimer removes the timer with its entries and saves', () => {
    const { store, stored } = setup()
    const [a, b] = addTwo(store)
    store.getState().toggleTimer(a)
    store.getState().deleteTimer(a)
    expect(store.getState().data.timers.map((timer) => timer.id)).toEqual([b])
    expect(store.getState().data.entries).toEqual([])
    expect(stored()).toEqual(store.getState().data)
  })

  it('setSingleRunning saves the setting and, when turned on, leaves only the last started timer running', () => {
    const { store, clock, stored } = setup()
    const [a, b] = addTwo(store)
    store.getState().setSingleRunning(false)
    store.getState().toggleTimer(b)
    clock.now += 1000
    store.getState().toggleTimer(a)
    clock.now += 1000
    store.getState().setSingleRunning(true)
    expect(store.getState().data.settings.singleRunning).toBe(true)
    expect(store.getState().data.entries).toEqual([
      expect.objectContaining({ timerId: b, endedAt: START + 2000 }),
      expect.objectContaining({ timerId: a, endedAt: null }),
    ])
    expect(stored()).toEqual(store.getState().data)
  })

  it('importLegacy saves and returns the counts, leaving no invariant violations', () => {
    const { store, stored } = setup()
    expect(store.getState().importLegacy(legacyFixture())).toEqual({ imported: 9, skipped: 0 })
    expect(store.getState().data.timers).toHaveLength(9)
    expect(findInvariantViolations(store.getState().data)).toEqual([])
    expect(stored()).toEqual(store.getState().data)
  })

  it('importing the same file again imports nothing and does not save', () => {
    const { store, writes } = setup()
    store.getState().importLegacy(legacyFixture())
    const before = store.getState().data
    writes.length = 0
    expect(store.getState().importLegacy(legacyFixture())).toEqual({ imported: 0, skipped: 9 })
    expect(store.getState().data).toBe(before)
    expect(writes).toEqual([])
  })

  it('replaceData takes the new data without saving', () => {
    const { store, writes } = setup()
    store.getState().replaceData(validState)
    expect(store.getState().data).toBe(validState)
    expect(writes).toEqual([])
  })

  it('dismissStorageNotice clears corrupt or repaired, but not save errors', () => {
    const repaired = setup({ [STATE_KEY]: JSON.stringify(orphanEntryState) })
    repaired.store.getState().dismissStorageNotice()
    expect(repaired.store.getState().storageStatus).toBe('ok')

    const failing = setup()
    failing.setFailWrite(() => true)
    failing.store.getState().addTimer({ groupId: groupId(failing.store.getState().data), name: 'A' })
    failing.store.getState().dismissStorageNotice()
    expect(failing.store.getState().storageStatus).toBe('save-failed')
  })
})

describe('syncWithOtherTabs', () => {
  it('replaces the data when another tab saves valid data, without saving it back', () => {
    const { store, storage, memory, writes } = setup()
    syncWithOtherTabs(store, storage)
    memory.emitExternalChange(STATE_KEY, JSON.stringify(validState))
    expect(store.getState().data).toEqual(validState)
    expect(writes).toEqual([])
  })

  it('takes repaired data from another tab without writing anything', () => {
    const { store, storage, memory, writes } = setup()
    syncWithOtherTabs(store, storage)
    memory.emitExternalChange(STATE_KEY, JSON.stringify(orphanEntryState))
    expect(store.getState().data.entries).toEqual([])
    expect(writes).toEqual([])
  })

  it('keeps its state when another tab leaves unreadable data', () => {
    const { store, storage, memory } = setup()
    addTwo(store)
    const before = store.getState().data
    syncWithOtherTabs(store, storage)
    memory.emitExternalChange(STATE_KEY, '{')
    expect(store.getState().data).toBe(before)
  })

  it('stops syncing when cancelled', () => {
    const { store, storage, memory } = setup()
    const before = store.getState().data
    syncWithOtherTabs(store, storage)()
    memory.emitExternalChange(STATE_KEY, JSON.stringify(validState))
    expect(store.getState().data).toBe(before)
  })
})
