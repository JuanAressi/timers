/** Minimal key-value store. In the browser it's `localStorage`; in tests, memory. */
export interface KeyValueBackend {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
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
  }
}

export interface MemoryBackend extends KeyValueBackend {
  /** Copy of everything stored, for assertions in tests. */
  dump(): Record<string, string>
}

export function createMemoryBackend(initial: Record<string, string> = {}): MemoryBackend {
  const items = new Map(Object.entries(initial))
  return {
    getItem: (key) => items.get(key) ?? null,
    setItem: (key, value) => {
      items.set(key, value)
    },
    removeItem: (key) => {
      items.delete(key)
    },
    dump: () => Object.fromEntries(items),
  }
}
