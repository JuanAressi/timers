// Downloads go through here because v1 (Tauri) saves files with its own dialog instead.

/** Makes the browser download `text` as a file, like the prototype's "Exportar". */
export function downloadTextFile(filename: string, text: string, type = 'text/plain'): void {
  const url = URL.createObjectURL(new Blob([text], { type }))
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  // Revoked later: some browsers still read the URL after `click()` returns.
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/** `timers-YYYY-MM-DD.json` with the local date (the prototype used the UTC one). */
export function getBackupFilename(now: number): string {
  const date = new Date(now)
  const pad = (value: number) => String(value).padStart(2, '0')
  return `timers-${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}.json`
}
