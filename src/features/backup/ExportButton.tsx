import { appStore } from '../../store/instance'
import { serializeBackup } from '../../storage/backup'
import { Button } from '../../ui/Button'
import { downloadTextFile, getBackupFilename } from './download'

/** Downloads the state in memory, including changes that couldn't be saved. */
export function ExportButton() {
  function handleClick() {
    const now = Date.now()
    downloadTextFile(getBackupFilename(now), serializeBackup(appStore.getState().data, now), 'application/json')
  }

  return <Button onClick={handleClick}>Exportar</Button>
}
