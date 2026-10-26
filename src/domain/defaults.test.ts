import { describe, expect, it } from 'vitest'
import { createInitialState, DEFAULT_GROUP_NAME, ensureDefaultGroup } from './defaults'
import { buildState, sequentialIds } from './testUtils'

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
