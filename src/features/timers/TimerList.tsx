import type { Id } from '../../domain/types'
import { useAppStore } from '../../store/instance'
import { selectTimersOfGroup } from '../../store/selectors'
import { TimerRow } from './TimerRow'

export function TimerList({ groupId }: { groupId: Id }) {
  const data = useAppStore((state) => state.data)
  const timers = selectTimersOfGroup(data, groupId)

  if (timers.length === 0) {
    return (
      <p className="py-6 text-center text-neutral-500 dark:text-neutral-400">Todavía no hay timers. Agregá uno arriba.</p>
    )
  }

  return (
    <ul className="flex flex-col gap-2">
      {timers.map((timer) => (
        <TimerRow key={timer.id} timer={timer} />
      ))}
    </ul>
  )
}
