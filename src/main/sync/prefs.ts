import { promises as fs } from 'node:fs'
import { join } from 'node:path'
import { randomUUID } from 'node:crypto'
import { app } from 'electron'
import { homedir } from 'node:os'

export interface SyncPrefs {
  enabled: boolean
  syncDir: string
  lastExportAt: number
  lastMergeAt: number
}

const DEFAULT_SYNC_DIR = join(homedir(), 'Syncthing', 'DecisionJournal')

const DEFAULT_PREFS: SyncPrefs = {
  enabled: false,
  syncDir: DEFAULT_SYNC_DIR,
  lastExportAt: 0,
  lastMergeAt: 0
}

function prefsPath(): string {
  return join(app.getPath('userData'), 'sync-prefs.json')
}

function deviceIdPath(): string {
  return join(app.getPath('userData'), 'sync-device-id.json')
}

export async function loadSyncPrefs(): Promise<SyncPrefs> {
  try {
    const raw = await fs.readFile(prefsPath(), 'utf8')
    const parsed = JSON.parse(raw) as Partial<SyncPrefs>
    return { ...DEFAULT_PREFS, ...parsed }
  } catch {
    return { ...DEFAULT_PREFS }
  }
}

export async function saveSyncPrefs(prefs: SyncPrefs): Promise<void> {
  await fs.writeFile(prefsPath(), JSON.stringify(prefs, null, 2), {
    encoding: 'utf8',
    mode: 0o600
  })
}

export async function getDeviceId(): Promise<string> {
  try {
    const raw = await fs.readFile(deviceIdPath(), 'utf8')
    const parsed = JSON.parse(raw) as { id?: string }
    if (parsed.id) return parsed.id
  } catch {
    // no file yet
  }
  const id = randomUUID().replace(/-/g, '').slice(0, 12)
  await fs.writeFile(deviceIdPath(), JSON.stringify({ id }, null, 2), {
    encoding: 'utf8',
    mode: 0o600
  })
  return id
}
