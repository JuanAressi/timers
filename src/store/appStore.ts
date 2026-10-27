import { createStore, type StoreApi } from 'zustand/vanilla'
import { createInitialState, ensureDefaultGroup } from '../domain/defaults'
import { toggleTimer } from '../domain/sessions'
import { addTimer, renameTimer } from '../domain/timers'
import type { Id, IdFactory, PersistedState } from '../domain/types'
import type { AppStorage, LoadResult } from '../storage/storage'

/**
 * - `ok`: the last save worked (or nothing was saved yet).
 * - `save-failed`: the last save failed.
 * - `unavailable`: storage couldn't be read at startup.
 * - `corrupt` / `repaired`: what `load` found. They stay after later saves so the UI can still report them.
 */
export type StorageStatus = 'ok' | 'save-failed' | 'unavailable' | 'corrupt' | 'repaired'

export interface AppState {
  data: PersistedState
  storageStatus: StorageStatus
  /** Set when `load` couldn't back up the stored data: saving now would overwrite the only copy. */
  saveBlocked: boolean
  /** Returns `false` when nothing was added (empty name or missing group). */
  addTimer: (input: { groupId: Id; name: string }) => boolean
  renameTimer: (timerId: Id, name: string) => void
  toggleTimer: (timerId: Id) => void
}

export type AppStore = StoreApi<AppState>

export interface AppStoreDeps {
  storage: AppStorage
  clock: () => number
  newId: IdFactory
}

type LoadedState = Pick<AppState, 'data' | 'storageStatus' | 'saveBlocked'>

function fromLoadResult(result: LoadResult, now: number, newId: IdFactory): LoadedState {
  switch (result.kind) {
    case 'empty':
      return { data: createInitialState(now, newId), storageStatus: 'ok', saveBlocked: false }
    case 'loaded':
      return { data: ensureDefaultGroup(result.state, now, newId), storageStatus: 'ok', saveBlocked: false }
    case 'repaired':
      return {
        data: ensureDefaultGroup(result.state, now, newId),
        storageStatus: 'repaired',
        saveBlocked: result.backupKey === null,
      }
    case 'corrupt':
      return { data: createInitialState(now, newId), storageStatus: 'corrupt', saveBlocked: !result.backedUp }
    case 'unavailable':
      return { data: createInitialState(now, newId), storageStatus: 'unavailable', saveBlocked: false }
  }
}

/** Status after a save: a success clears the save errors but keeps what `load` found. */
function statusAfterSave(current: StorageStatus, saved: boolean): StorageStatus {
  if (!saved) return 'save-failed'
  return current === 'save-failed' || current === 'unavailable' ? 'ok' : current
}

/** Creates the app store. Dependencies are injected so tests can use a memory backend and a fake clock. */
export function createAppStore({ storage, clock, newId }: AppStoreDeps): AppStore {
  return createStore<AppState>()((set, get) => {
    /** Stores the new data and saves it, unless nothing changed or saving is blocked. */
    function commit(data: PersistedState) {
      const { data: current, saveBlocked, storageStatus } = get()
      if (data === current) return
      if (saveBlocked) {
        set({ data })
        return
      }
      const saved = storage.save(data).ok
      set({ data, storageStatus: statusAfterSave(storageStatus, saved) })
    }

    return {
      ...fromLoadResult(storage.load(), clock(), newId),

      addTimer: (input) => {
        const result = addTimer(get().data, input, clock(), newId)
        if (!result.ok) return false
        commit(result.value)
        return true
      },

      renameTimer: (timerId, name) => {
        commit(renameTimer(get().data, timerId, name))
      },

      toggleTimer: (timerId) => {
        commit(toggleTimer(get().data, timerId, clock(), newId))
      },
    }
  })
}
