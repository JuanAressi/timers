import type { AppStorage } from '../storage/storage'
import type { AppStore } from './appStore'

/**
 * Keeps the store in step with what other tabs save. Unreadable data is ignored, so this tab keeps what it has in
 * memory. Returns a function that stops syncing.
 */
export function syncWithOtherTabs(store: AppStore, storage: AppStorage): () => void {
  return storage.subscribe((result) => {
    if (result.kind === 'loaded' || result.kind === 'repaired') store.getState().replaceData(result.state)
  })
}
