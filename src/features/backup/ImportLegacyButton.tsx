import { useRef, useState, type ChangeEvent } from 'react'
import { DEFAULT_GROUP_NAME } from '../../domain/defaults'
import { importLegacyBackup } from '../../domain/legacyImport'
import { appStore, useAppStore } from '../../store/instance'
import { parseLegacyBackup, type LegacyBackup } from '../../storage/legacyBackup'
import { Button } from '../../ui/Button'
import { ConfirmDialog } from '../../ui/ConfirmDialog'
import { Dialog } from '../../ui/Dialog'

type Step =
  | { kind: 'idle' }
  | { kind: 'confirm'; backup: LegacyBackup; imported: number; skipped: number }
  | { kind: 'nothing-new' }
  | { kind: 'invalid' }

function plural(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`
}

function describeImport({ backup, imported, skipped }: Extract<Step, { kind: 'confirm' }>): string {
  let text = `Se ${imported === 1 ? 'va' : 'van'} a importar ${plural(imported, 'timer', 'timers')} al grupo ${DEFAULT_GROUP_NAME}`
  if (skipped > 0) text += ` (${skipped} ya ${skipped === 1 ? 'existía y se saltea' : 'existían y se saltean'})`
  text += '.'
  if (backup.exportedAt !== null) {
    const date = new Date(backup.exportedAt).toLocaleString('es-AR', { dateStyle: 'long', timeStyle: 'short', hourCycle: 'h23' })
    text += ` Exportado el ${date}.`
  }
  return text
}

/** Reads the prototype's backup file, shows what will be imported and imports it after confirming. */
export function ImportLegacyButton() {
  const importLegacy = useAppStore((state) => state.importLegacy)
  const inputRef = useRef<HTMLInputElement>(null)
  const [step, setStep] = useState<Step>({ kind: 'idle' })
  const close = () => setStep({ kind: 'idle' })

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    // Cleared so that choosing the same file again fires `change` again.
    event.target.value = ''
    if (!file) return
    let parsed: ReturnType<typeof parseLegacyBackup>
    try {
      parsed = parseLegacyBackup(JSON.parse(await file.text()))
    } catch {
      parsed = { ok: false, error: 'invalid JSON' }
    }
    if (!parsed.ok) {
      setStep({ kind: 'invalid' })
      return
    }
    // Dry run over the current data, only to count what's new. The ids it makes are thrown away.
    const { imported, skipped } = importLegacyBackup(appStore.getState().data, parsed.value, Date.now(), () => '')
    setStep(imported === 0 ? { kind: 'nothing-new' } : { kind: 'confirm', backup: parsed.value, imported, skipped })
  }

  return (
    <>
      <Button onClick={() => inputRef.current?.click()}>Importar respaldo del prototipo</Button>
      <input ref={inputRef} type="file" accept="application/json,.json" hidden onChange={handleFile} />
      <ConfirmDialog
        open={step.kind === 'confirm'}
        title="Importar respaldo del prototipo"
        description={step.kind === 'confirm' ? describeImport(step) : ''}
        confirmLabel="Importar"
        onConfirm={() => {
          if (step.kind === 'confirm') importLegacy(step.backup)
          close()
        }}
        onCancel={close}
      />
      <Dialog
        open={step.kind === 'nothing-new' || step.kind === 'invalid'}
        title={step.kind === 'invalid' ? 'No se pudo importar' : 'Nada para importar'}
        onClose={close}
        actions={
          <Button variant="primary" data-autofocus onClick={close}>
            Entendido
          </Button>
        }
      >
        {step.kind === 'invalid'
          ? 'El archivo no es un respaldo válido del prototipo.'
          : 'Todos los timers de este archivo ya estaban importados.'}
      </Dialog>
    </>
  )
}
