/** Minimal key-value store. In the browser it's `localStorage`; in tests, memory. */
export interface KeyValueBackend {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
  /**
   * Calls `listener` with the key when another tab or window changes a value. Changes made through this backend
   * aren't reported. Returns a function that cancels the subscription.
   */
  subscribe(listener: (key: string) => void): () => void
}

/**
 * Wraps `window.localStorage`. Errors propagate (private mode, blocked storage, full quota) so that `load` and `save`
 * can report them. `localStorage` is read on every call because just accessing it can throw.
 */
export function createLocalStorageBackend(): KeyValueBackend {
  return {
    getItem: (key) => window.localStorage.getItem(key),
    setItem: (key, value) => window.localStorage.setItem(key, value),
    removeItem: (key) => window.localStorage.removeItem(key),
    subscribe: (listener) => {
      // The browser only fires `storage` in the other tabs. `key` is null when the storage is cleared.
      function handleStorage(event: StorageEvent) {
        if (event.key !== null && event.storageArea === window.localStorage) listener(event.key)
      }
      window.addEventListener('storage', handleStorage)
      return () => window.removeEventListener('storage', handleStorage)
    },
  }
}

export interface MemoryBackend extends KeyValueBackend {
  /** Copy of everything stored, for assertions in tests. */
  dump(): Record<string, string>
  /** Simulates another tab writing `value` (or removing the key with `null`): stores it and notifies subscribers. */
  emitExternalChange(key: string, value: string | null): void
}

export function createMemoryBackend(initial: Record<string, string> = {}): MemoryBackend {
  const items = new Map(Object.entries(initial))
  const listeners = new Set<(key: string) => void>()
  return {
    getItem: (key) => items.get(key) ?? null,
    setItem: (key, value) => {
      items.set(key, value)
    },
    removeItem: (key) => {
      items.delete(key)
    },
    subscribe: (listener) => {
      // Wrapped so that subscribing the same function twice gives two independent subscriptions.
      const wrapped = (key: string) => listener(key)
      listeners.add(wrapped)
      return () => {
        listeners.delete(wrapped)
      }
    },
    dump: () => Object.fromEntries(items),
    emitExternalChange: (key, value) => {
      if (value === null) items.delete(key)
      else items.set(key, value)
      for (const listener of listeners) listener(key)
    },
  }
}
