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
      {group && (
        <>
          <AddTimerForm groupId={group.id} />
          <TimerList groupId={group.id} />
        </>
      )}
    </main>
  )
}

export default App
