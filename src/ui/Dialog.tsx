import { useEffect, useId, useRef, type MouseEvent, type ReactNode, type SyntheticEvent } from 'react'

export interface DialogProps {
  open: boolean
  title: string
  /** Called when the user closes it: Escape, a click on the backdrop or a button that calls it. */
  onClose: () => void
  children: ReactNode
  /** Buttons at the bottom. The one with `data-autofocus` gets the focus when it opens (use it on the safe one). */
  actions: ReactNode
}

/**
 * Modal over the native `<dialog>`, controlled by `open`. When it closes, the focus goes back to the element that
 * had it when it opened.
 */
export function Dialog({ open, title, onClose, children, actions }: DialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const returnFocusRef = useRef<HTMLElement | null>(null)
  const openRef = useRef(open)
  const titleId = useId()

  useEffect(() => {
    openRef.current = open
    const dialog = dialogRef.current
    if (!dialog) return
    if (open && !dialog.open) {
      returnFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
      dialog.showModal()
      dialog.querySelector<HTMLElement>('[data-autofocus]')?.focus()
    } else if (!open && dialog.open) {
      dialog.close()
    }
  }, [open])

  // Escape: `open` decides, so the parent closes it right away instead of waiting for the queued `close` event.
  function handleCancel(event: SyntheticEvent<HTMLDialogElement>) {
    event.preventDefault()
    onClose()
  }

  // The content fills the dialog, so a click whose target is the dialog itself landed on the backdrop.
  function handleClick(event: MouseEvent<HTMLDialogElement>) {
    if (event.target === event.currentTarget) onClose()
  }

  // Fires after every close, as a queued event: gives the focus back.
  function handleClose(event: SyntheticEvent<HTMLDialogElement>) {
    // If the dialog was opened again in between, the event belongs to the previous close.
    if (event.currentTarget.open) return
    const returnFocus = returnFocusRef.current
    returnFocusRef.current = null
    if (returnFocus?.isConnected) returnFocus.focus()
    // The browser closed it on its own (it doesn't always let Escape be cancelled): tell the parent.
    if (openRef.current) onClose()
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      onCancel={handleCancel}
      onClose={handleClose}
      onClick={handleClick}
      className="m-auto w-[calc(100%-2rem)] max-w-sm rounded-xl border border-neutral-200 bg-white p-0 text-neutral-900 shadow-xl backdrop:bg-black/40 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100 dark:backdrop:bg-black/70"
    >
      <div className="flex flex-col gap-3 p-5">
        <h2 id={titleId} className="text-base font-semibold">
          {title}
        </h2>
        <div className="text-neutral-700 dark:text-neutral-300">{children}</div>
        <div className="mt-2 flex flex-wrap justify-end gap-2">{actions}</div>
      </div>
    </dialog>
  )
}
