import { formatDuration } from '../../domain/format'
import { useNow } from '../../store/clock'
import { useAppStore } from '../../store/instance'
import { selectDayTotalMs } from '../../store/selectors'

export function DayTotal() {
  const data = useAppStore((state) => state.data)
  const now = useNow()

  return (
    <p className="text-neutral-500 tabular-nums dark:text-neutral-400">
      Hoy <span className="font-semibold text-neutral-900 dark:text-neutral-100">{formatDuration(selectDayTotalMs(data, now))}</span>
    </p>
  )
}
