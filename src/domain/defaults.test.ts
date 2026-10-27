import { describe, expect, it } from 'vitest'
import { createInitialState, DEFAULT_GROUP_NAME, ensureDefaultGroup, ensureGeneralGroup, nextOrder } from './defaults'
import { buildState, makeGroup, sequentialIds } from './testUtils'

describe('createInitialState', () => {
  it('has only the "General" group and default settings', () => {
    const state = createInitialState(1000, sequentialIds())
    expect(state.schemaVersion).toBe(1)
    expect(state.groups).toHaveLength(1)
    expect(state.groups[0]).toMatchObject({ id: 'id-1', name: DEFAULT_GROUP_NAME, createdAt: 1000, archivedAt: null })
    expect(state.timers).toEqual([])
    expect(state.entries).toEqual([])
    expect(state.settings).toEqual({ singleRunning: true })
  })
})

describe('ensureDefaultGroup', () => {
  it('creates "General" when there are no groups', () => {
    const state = ensureDefaultGroup(buildState({ groups: [] }), 1000, sequentialIds())
    expect(state.groups.map((group) => group.name)).toEqual([DEFAULT_GROUP_NAME])
  })

  it('returns the same state when a group exists', () => {
    const state = buildState()
    expect(ensureDefaultGroup(state, 1000, sequentialIds())).toBe(state)
  })
})

describe('ensureGeneralGroup', () => {
  it('reuses the first active "General"', () => {
    const state = buildState({
      groups: [
        makeGroup('old', { name: DEFAULT_GROUP_NAME, archivedAt: 500 }),
        makeGroup('general', { name: DEFAULT_GROUP_NAME, order: 1 }),
      ],
    })
    expect(ensureGeneralGroup(state, 1000, sequentialIds())).toEqual({ state, groupId: 'general', created: false })
  })

  it('creates "General" after the existing groups when there is no active one', () => {
    const base = buildState({ groups: [makeGroup('work', { order: 2 }), makeGroup('old', { name: DEFAULT_GROUP_NAME, archivedAt: 500 })] })
    const { state, groupId, created } = ensureGeneralGroup(base, 1000, sequentialIds())
    expect(created).toBe(true)
    expect(groupId).toBe('id-1')
    expect(state.groups[2]).toMatchObject({ id: 'id-1', name: DEFAULT_GROUP_NAME, order: 3, createdAt: 1000, archivedAt: null })
  })
})

describe('nextOrder', () => {
  it('goes after the highest order, or starts at 0', () => {
    expect(nextOrder([])).toBe(0)
    expect(nextOrder([{ order: 0 }, { order: 4 }, { order: 2 }])).toBe(5)
  })
})
