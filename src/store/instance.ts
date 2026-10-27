import { useStore } from 'zustand'
import { createLocalStorageBackend } from '../storage/backend'
import { createStorage } from '../storage/storage'
import { createAppStore, type AppState } from './appStore'
import { syncWithOtherTabs } from './tabSync'

const clock = () => Date.now()
const newId = () => crypto.randomUUID()

const storage = createStorage(createLocalStorageBackend(), { clock, newId })

/** The app's store, persisted in `localStorage`. */
export const appStore = createAppStore({ storage, clock, newId })

syncWithOtherTabs(appStore, storage)

export function useAppStore<T>(selector: (state: AppState) => T): T {
  return useStore(appStore, selector)
}
