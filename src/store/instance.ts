import { useStore } from 'zustand'
import { createLocalStorageBackend } from '../storage/backend'
import { createStorage } from '../storage/storage'
import { createAppStore, type AppState } from './appStore'

const clock = () => Date.now()
const newId = () => crypto.randomUUID()

/** The app's store, persisted in `localStorage`. */
export const appStore = createAppStore({
  storage: createStorage(createLocalStorageBackend(), { clock, newId }),
  clock,
  newId,
})

export function useAppStore<T>(selector: (state: AppState) => T): T {
  return useStore(appStore, selector)
}
