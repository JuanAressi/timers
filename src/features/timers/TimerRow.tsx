import { useRef, useState, type KeyboardEvent } from 'react'
import { formatDuration } from '../../domain/format'
import { MAX_TIMER_NAME_LENGTH, normalizeTimerName } from '../../domain/timers'
import type { Timer } from '../../domain/types'
import { useNow } from '../../store/clock'
import { useAppStore } from '../../store/instance'
import { selectTimerTimes } from '../../store/selectors'
import { Button } from '../../ui/Button'
import { DeleteTimerButton } from './DeleteTimerButton'

/** Inline name editor: commits on blur (Enter blurs), Escape reverts. */
function TimerNameInput({ timer }: { timer: Timer }) {
  const renameTimer = useAppStore((state) => state.renameTimer)
  const [draft, setDraft] = useState(timer.name)
  const [syncedName, setSyncedName] = useState(timer.name)
  const cancelled = useRef(false)

  // Follow renames made elsewhere.
  if (timer.name !== syncedName) {
    setSyncedName(timer.name)
    setDraft(timer.name)
  }

  function handleBlur() {
    if (cancelled.current) {
      cancelled.current = false
      setDraft(timer.name)
      return
    }
    renameTimer(timer.id, draft)
    setDraft(normalizeTimerName(draft))
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter') event.currentTarget.blur()
    if (event.key === 'Escape') {
      cancelled.current = true
      event.currentTarget.blur()
    }
  }

  return (
    <input
      type="text"
      value={draft}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      maxLength={MAX_TIMER_NAME_LENGTH}
      aria-label="Nombre del timer"
      className="min-w-0 flex-1 basis-full truncate rounded-md border border-transparent bg-transparent px-2 py-1.5 hover:border-neutral-300 focus:border-neutral-300 focus:bg-white focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent min-[440px]:basis-auto dark:hover:border-neutral-700 dark:focus:border-neutral-700 dark:focus:bg-neutral-900"
    />
  )
}

export function TimerRow({ timer }: { timer: Timer }) {
  const data = useAppStore((state) => state.data)
  const toggleTimer = useAppStore((state) => state.toggleTimer)
  const now = useNow()
  const { totalMs, todayMs, running } = selectTimerTimes(data, timer.id, now)

  return (
    <li
      className={`flex flex-wrap items-center gap-2 rounded-xl border px-3 py-2.5 min-[440px]:flex-nowrap ${
        running ? 'border-accent bg-accent-soft' : 'border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900'
      }`}
    >
      <TimerNameInput timer={timer} />
      {/* On narrow screens the times go under the name, aligned with its text (input padding + border). */}
      <div className="mr-auto pl-2.25 tabular-nums min-[440px]:mr-0 min-[440px]:min-w-[7ch] min-[440px]:pl-0 min-[440px]:text-right">
        <div className={`text-xl leading-tight font-semibold ${running ? 'text-accent' : ''}`}>
          <span className="sr-only">Total </span>
          {formatDuration(totalMs)}
        </div>
        <div className="text-xs text-neutral-500 dark:text-neutral-400">Hoy {formatDuration(todayMs)}</div>
      </div>
      <Button
        variant={running ? 'secondary' : 'primary'}
        className="min-w-20"
        aria-label={`${running ? 'Pausar' : 'Iniciar'} ${timer.name}`}
        onClick={() => toggleTimer(timer.id)}
      >
        {running ? 'Pausar' : 'Iniciar'}
      </Button>
      <DeleteTimerButton timer={timer} totalMs={totalMs} />
    </li>
  )
}
