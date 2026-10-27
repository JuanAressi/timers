import { useStore } from 'zustand'
import { createStore } from 'zustand/vanilla'

const TICK_MS = 1000

interface ClockState {
  now: number
}

/** Current time for the UI. Times are derived from timestamps, so this only drives re-renders. */
export const clockStore = createStore<ClockState>()(() => ({ now: Date.now() }))

let running = false

/**
 * Starts the app's only interval. Every second it calls `onTick(now)` and updates `now`, except while the tab is
 * hidden: then `now` stays put, so nothing re-renders, but `onTick` still runs (it keeps the tab title current).
 * Coming back to the tab updates `now` right away. Starting it twice does nothing.
 */
export function startClock(onTick: (now: number) => void): void {
  if (running) return
  running = true

  function tick() {
    const now = Date.now()
    if (!document.hidden) clockStore.setState({ now })
    onTick(now)
  }

  window.setInterval(tick, TICK_MS)
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) tick()
  })
  tick()
}

export function useNow(): number {
  return useStore(clockStore, (state) => state.now)
}
