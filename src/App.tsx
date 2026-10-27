import { ExportButton } from './features/backup/ExportButton'
import { ImportLegacyButton } from './features/backup/ImportLegacyButton'
import { SingleRunningToggle } from './features/settings/SingleRunningToggle'
import { StorageWarning } from './features/storage/StorageWarning'
import { AddTimerForm } from './features/timers/AddTimerForm'
import { DayTotal } from './features/timers/DayTotal'
import { TimerList } from './features/timers/TimerList'
import { useAppStore } from './store/instance'
import { selectDefaultGroup } from './store/selectors'

function App() {
  const group = useAppStore((state) => selectDefaultGroup(state.data))

  return (
    <main className="mx-auto max-w-xl px-4 pt-5 pb-10">
      <header className="mb-4 flex items-baseline justify-between gap-3">
        <h1 className="text-lg font-semibold">Timers</h1>
        <DayTotal />
      </header>
      {group && <AddTimerForm groupId={group.id} />}
      <StorageWarning />
      {group && <TimerList groupId={group.id} />}
      <footer className="mt-6 flex flex-col items-start gap-3 border-t border-neutral-200 pt-4 text-neutral-600 dark:border-neutral-800 dark:text-neutral-400">
        <SingleRunningToggle />
        <div className="flex flex-wrap gap-2">
          <ExportButton />
          <ImportLegacyButton />
        </div>
      </footer>
    </main>
  )
}

export default App
