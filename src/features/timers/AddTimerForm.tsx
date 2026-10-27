import { useRef, useState, type SubmitEvent } from 'react'
import { MAX_TIMER_NAME_LENGTH } from '../../domain/timers'
import type { Id } from '../../domain/types'
import { useAppStore } from '../../store/instance'
import { Button } from '../../ui/Button'

export function AddTimerForm({ groupId }: { groupId: Id }) {
  const addTimer = useAppStore((state) => state.addTimer)
  const [name, setName] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    // With an empty name nothing is added and the focus stays on the input.
    if (addTimer({ groupId, name })) setName('')
    inputRef.current?.focus()
  }

  return (
    <form className="mb-4 flex gap-2" autoComplete="off" onSubmit={handleSubmit}>
      <input
        ref={inputRef}
        type="text"
        value={name}
        onChange={(event) => setName(event.target.value)}
        placeholder="Nombre del proyecto"
        maxLength={MAX_TIMER_NAME_LENGTH}
        aria-label="Nombre del nuevo timer"
        className="min-w-0 flex-1 rounded-lg border border-neutral-300 bg-white px-3 py-2 placeholder:text-neutral-500 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent dark:border-neutral-700 dark:bg-neutral-900 dark:placeholder:text-neutral-400"
      />
      <Button type="submit" variant="primary">
        Agregar
      </Button>
    </form>
  )
}
