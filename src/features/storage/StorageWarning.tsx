import type { StorageStatus } from '../../store/appStore'
import { useAppStore } from '../../store/instance'
import { Button } from '../../ui/Button'
import { ExportButton } from '../backup/ExportButton'

interface Notice {
  text: string
  /** Load notices can be dismissed; save problems stay while they last. */
  dismissible: boolean
}

function getNotice(status: StorageStatus, saveBlocked: boolean): Notice | null {
  if (saveBlocked) {
    const found = status === 'repaired' ? 'datos inconsistentes' : 'datos ilegibles'
    return {
      text:
        `Se encontraron ${found} guardados y no se pudo hacer una copia, así que no se van a sobrescribir. ` +
        'Lo que hagas a partir de ahora se pierde al recargar: exportá un respaldo para conservarlo.',
      dismissible: false,
    }
  }
  switch (status) {
    case 'ok':
      return null
    case 'save-failed':
      return {
        text: 'No se pudo guardar en este navegador (¿modo incógnito o almacenamiento lleno?). Exportá un respaldo para no perder los tiempos.',
        dismissible: false,
      }
    case 'unavailable':
      return {
        text: 'El almacenamiento de este navegador no está disponible (¿modo incógnito o almacenamiento bloqueado?). Los cambios no se van a guardar: exportá un respaldo para no perder los tiempos.',
        dismissible: false,
      }
    case 'corrupt':
      return {
        text: 'Se encontraron datos guardados ilegibles. Se guardó una copia en este navegador y la app arrancó vacía.',
        dismissible: true,
      }
    case 'repaired':
      return {
        text: 'Se encontraron datos inconsistentes y se corrigieron. El original quedó guardado como copia en este navegador.',
        dismissible: true,
      }
  }
}

export function StorageWarning() {
  const storageStatus = useAppStore((state) => state.storageStatus)
  const saveBlocked = useAppStore((state) => state.saveBlocked)
  const dismiss = useAppStore((state) => state.dismissStorageNotice)
  const notice = getNotice(storageStatus, saveBlocked)
  if (!notice) return null

  return (
    <div role="alert" className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border border-danger px-3 py-2.5 text-danger">
      <p className="min-w-0 flex-1 basis-60">{notice.text}</p>
      {notice.dismissible ? <Button onClick={dismiss}>Entendido</Button> : <ExportButton />}
    </div>
  )
}
