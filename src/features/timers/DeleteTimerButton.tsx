import { useState } from 'react'
import { formatDuration } from '../../domain/format'
import type { Timer } from '../../domain/types'
import { useAppStore } from '../../store/instance'
import { Button } from '../../ui/Button'
import { ConfirmDialog } from '../../ui/ConfirmDialog'

/** Trash can icon (inline until the icon library arrives with the icon picker). */
function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6M10 11v6M14 11v6" />
    </svg>
  )
}

/** `totalMs` is the timer's current total, shown in the confirmation. */
export function DeleteTimerButton({ timer, totalMs }: { timer: Timer; totalMs: number }) {
  const deleteTimer = useAppStore((state) => state.deleteTimer)
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button variant="icon" aria-label={`Borrar ${timer.name}`} title="Borrar" onClick={() => setOpen(true)}>
        <TrashIcon />
      </Button>
      <ConfirmDialog
        open={open}
        title="Borrar timer"
        description={`¿Borrar "${timer.name}"? Se pierden ${formatDuration(totalMs)} y todo su historial.`}
        confirmLabel="Borrar"
        tone="danger"
        onConfirm={() => {
          setOpen(false)
          deleteTimer(timer.id)
        }}
        onCancel={() => setOpen(false)}
      />
    </>
  )
}
