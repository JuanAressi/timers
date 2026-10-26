import { formatDuration } from './domain/format'

function App() {
  return (
    <main className="mx-auto max-w-xl px-4 py-8">
      <h1 className="text-lg font-semibold">Timers</h1>
      <p className="mt-2 text-sm text-neutral-500">
        v0 scaffold — {formatDuration(0)}. See <code>docs/roadmap.md</code> for what comes next.
      </p>
    </main>
  )
}

export default App
