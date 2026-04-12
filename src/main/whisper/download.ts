import { net, BrowserWindow } from 'electron'
import { createWriteStream, mkdirSync, existsSync, unlinkSync, renameSync } from 'node:fs'
import { getModelInfo, modelDir, modelPath, partialPath } from './models'
import { openDownloadGate, closeDownloadGate } from './download-gate'

let activeAbort: AbortController | null = null

function sendProgress(name: string, loaded: number, total: number): void {
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send('whisper:download-progress', { name, loaded, total })
  }
}

export function cancelDownload(): void {
  if (activeAbort) {
    activeAbort.abort()
    activeAbort = null
  }
}

export async function downloadModel(name: string): Promise<void> {
  const info = getModelInfo(name)
  if (!info) throw new Error(`Unknown model: ${name}`)

  const dir = modelDir()
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })

  const dest = modelPath(name)
  const partial = partialPath(name)

  if (existsSync(dest)) return

  if (existsSync(partial)) unlinkSync(partial)

  openDownloadGate()
  activeAbort = new AbortController()

  try {
    const response = await net.fetch(info.url, { signal: activeAbort.signal })

    if (!response.ok) {
      throw new Error(`Download failed: HTTP ${response.status}`)
    }

    const total = Number(response.headers.get('content-length') ?? info.sizeBytes)
    const body = response.body
    if (!body) throw new Error('No response body')

    const writer = createWriteStream(partial)
    const reader = body.getReader()
    let loaded = 0

    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      writer.write(Buffer.from(value))
      loaded += value.byteLength
      sendProgress(name, loaded, total)
    }

    await new Promise<void>((resolve, reject) => {
      writer.end(() => resolve())
      writer.on('error', reject)
    })

    renameSync(partial, dest)
    sendProgress(name, total, total)
  } catch (err) {
    if (existsSync(partial)) unlinkSync(partial)
    throw err
  } finally {
    closeDownloadGate()
    activeAbort = null
  }
}
