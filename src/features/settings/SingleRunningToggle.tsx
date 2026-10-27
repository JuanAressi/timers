import { useAppStore } from '../../store/instance'

export function SingleRunningToggle() {
  const singleRunning = useAppStore((state) => state.data.settings.singleRunning)
  const setSingleRunning = useAppStore((state) => state.setSingleRunning)

  return (
    <label className="flex cursor-pointer items-center gap-2">
      <input
        type="checkbox"
        checked={singleRunning}
        onChange={(event) => setSingleRunning(event.target.checked)}
        className="size-4 accent-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      />
      Solo uno corriendo a la vez
    </label>
  )
}
