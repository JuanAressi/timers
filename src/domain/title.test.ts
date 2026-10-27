import { describe, expect, it } from 'vitest'
import { buildState, makeGroup, makeTimer, MINUTE, session } from './testUtils'
import { DEFAULT_TITLE, getDocumentTitle } from './title'

const NOW = 100 * MINUTE

describe('getDocumentTitle', () => {
  it('is "Timers" when nothing is running', () => {
    const state = buildState({ timers: [makeTimer('a', 'g1')], entries: [session('s1', 'a', 0, MINUTE)] })
    expect(getDocumentTitle(state, NOW)).toBe(DEFAULT_TITLE)
  })

  it('shows the total and name of the running timer', () => {
    const state = buildState({
      timers: [makeTimer('a', 'g1', { name: 'Proyecto' })],
      entries: [session('s1', 'a', 0, 5 * MINUTE), session('s2', 'a', NOW - 10 * MINUTE)],
    })
    expect(getDocumentTitle(state, NOW)).toBe('0:15:00 · Proyecto')
  })

  it('picks the first running timer by group order and then timer order', () => {
    const state = buildState({
      groups: [makeGroup('g2', { order: 1 }), makeGroup('g1', { order: 0 })],
      timers: [
        makeTimer('c', 'g2', { name: 'C' }),
        makeTimer('b', 'g1', { name: 'B', order: 1 }),
        makeTimer('a', 'g1', { name: 'A', order: 2 }),
      ],
      entries: [session('s1', 'c', NOW - MINUTE), session('s2', 'a', NOW - 2 * MINUTE), session('s3', 'b', NOW - 3 * MINUTE)],
      settings: { singleRunning: false },
    })
    expect(getDocumentTitle(state, NOW)).toBe('0:03:00 · B')
  })
})
