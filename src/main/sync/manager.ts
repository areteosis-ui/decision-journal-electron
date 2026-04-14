/**
 * Syncthing-based sync manager.
 *
 * Strategy:
 * - Each device writes its own snapshot file to the shared Syncthing folder:
 *     snapshot-<deviceId>.db   — encrypted SQLCipher copy of this device's decisions
 *     meta-<deviceId>.json     — { deviceId, exportedAt, hostname }
 *     vault.json               — portable vault (written once on first export)
 *
 * - Per-device files mean Syncthing never has write conflicts between devices.
 * - On unlock, the app scans for other devices' snapshots newer than lastMergeAt
 *   and merges decisions using last-write-wins on updated_at.
 * - Deletions are NOT synced (a deleted decision on one device stays on the other).
 *   This is an intentional conservative choice for a journal — entries are valuable.
 */

import { promises as fs } from 'node:fs'
import { join } from 'node:path'
import { hostname } from 'node:os'
import { homedir } from 'node:os'
import { BrowserWindow } from 'electron'
import type Database from 'better-sqlite3-multiple-ciphers'
import { openEncryptedDb, closeDb } from '../db/open'
import { loadSyncPrefs, saveSyncPrefs, getDeviceId, type SyncPrefs } from './prefs'
import { Vault } from '../crypto/vault'

type DB = Database.Database

interface SyncMeta {
  deviceId: string
  exportedAt: number
  hostname: string
}

export interface SyncStatus {
  enabled: boolean
  syncDir: string
  deviceId: string
  lastExportAt: number
  lastMergeAt: number
  syncDirExists: boolean
}

export interface MergeResult {
  ok: boolean
  inserted: number
  updated: number
  error?: string
}

// Debounce timer for auto-export after writes
let exportDebounceTimer: ReturnType<typeof setTimeout> | null = null
const EXPORT_DEBOUNCE_MS = 3000

// ─────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────

/**
 * Schedule a debounced export. Called after every decision write.
 * Waits EXPORT_DEBOUNCE_MS after the last write before exporting,
 * so rapid-fire creates/edits produce only one snapshot write.
 */
export function scheduleExport(
  db: DB,
  masterKey: Buffer,
  vaultPath: string
): void {
  if (exportDebounceTimer) clearTimeout(exportDebounceTimer)
  exportDebounceTimer = setTimeout(() => {
    exportDebounceTimer = null
    runExport(db, masterKey, vaultPath).catch((err) => {
      console.error('[sync] background export failed', err)
    })
  }, EXPORT_DEBOUNCE_MS)
}

/**
 * Immediate export. Returns ok/error.
 */
export async function runExport(
  db: DB,
  masterKey: Buffer,
  vaultPath: string
): Promise<{ ok: boolean; error?: string }> {
  const prefs = await loadSyncPrefs()
  if (!prefs.enabled) return { ok: true }

  const syncDir = resolveSyncDir(prefs.syncDir)
  try {
    await fs.mkdir(syncDir, { recursive: true })
  } catch {
    return { ok: false, error: 'Cannot create sync directory' }
  }

  const deviceId = await getDeviceId()

  try {
    // 1. Flush WAL to main DB file so the copy is complete
    db.pragma('wal_checkpoint(TRUNCATE)')

    // 2. Copy the encrypted DB as this device's snapshot
    const snapshotPath = join(syncDir, `snapshot-${deviceId}.db`)
    const dbFile = (db as unknown as { filename: string }).filename
    await fs.copyFile(dbFile, snapshotPath)
    await fs.chmod(snapshotPath, 0o600)

    // 3. Write metadata
    const meta: SyncMeta = {
      deviceId,
      exportedAt: Date.now(),
      hostname: hostname()
    }
    await fs.writeFile(
      join(syncDir, `meta-${deviceId}.json`),
      JSON.stringify(meta, null, 2),
      { encoding: 'utf8', mode: 0o600 }
    )

    // 4. Export portable vault.json on first export (or if missing)
    const syncVaultPath = join(syncDir, 'vault.json')
    try {
      await fs.access(syncVaultPath)
      // Already exists — don't overwrite so the first-setup device's vault wins
    } catch {
      const vault = new Vault(vaultPath)
      const portableJson = await vault.exportPortable()
      await fs.writeFile(syncVaultPath, portableJson, {
        encoding: 'utf8',
        mode: 0o600
      })
    }

    // 5. Persist lastExportAt
    prefs.lastExportAt = Date.now()
    await saveSyncPrefs(prefs)

    broadcastSyncEvent({ type: 'exported', exportedAt: prefs.lastExportAt })
    return { ok: true }
  } catch (err) {
    console.error('[sync] export error', err)
    return { ok: false, error: err instanceof Error ? err.message : String(err) }
  }
}

/**
 * Merge decisions from all other devices' snapshots into the local DB.
 * Uses last-write-wins on updated_at. New decisions are inserted; existing
 * decisions are updated only when the remote updated_at is strictly newer.
 */
export async function runMerge(
  db: DB,
  masterKey: Buffer
): Promise<MergeResult> {
  const prefs = await loadSyncPrefs()
  if (!prefs.enabled) return { ok: true, inserted: 0, updated: 0 }

  const syncDir = resolveSyncDir(prefs.syncDir)
  const deviceId = await getDeviceId()

  let entries: string[]
  try {
    entries = await fs.readdir(syncDir)
  } catch {
    return { ok: false, inserted: 0, updated: 0, error: 'Sync directory not found' }
  }

  // Find all meta files for OTHER devices
  const metaFiles = entries.filter(
    (f) => f.startsWith('meta-') && f.endsWith('.json') && !f.includes(deviceId)
  )

  let totalInserted = 0
  let totalUpdated = 0

  for (const metaFile of metaFiles) {
    try {
      const raw = await fs.readFile(join(syncDir, metaFile), 'utf8')
      const meta = JSON.parse(raw) as SyncMeta

      // Skip snapshots we've already merged (nothing new since lastMergeAt)
      if (meta.exportedAt <= prefs.lastMergeAt) continue

      const snapshotPath = join(syncDir, `snapshot-${meta.deviceId}.db`)
      try {
        await fs.access(snapshotPath)
      } catch {
        continue // snapshot not yet synced by Syncthing
      }

      const { inserted, updated } = await mergeSnapshot(db, masterKey, snapshotPath)
      totalInserted += inserted
      totalUpdated += updated
    } catch (err) {
      console.warn('[sync] skipping snapshot due to error', metaFile, err)
    }
  }

  prefs.lastMergeAt = Date.now()
  await saveSyncPrefs(prefs)

  broadcastSyncEvent({
    type: 'merged',
    inserted: totalInserted,
    updated: totalUpdated,
    mergedAt: prefs.lastMergeAt
  })

  return { ok: true, inserted: totalInserted, updated: totalUpdated }
}

export async function getSyncStatus(): Promise<SyncStatus> {
  const prefs = await loadSyncPrefs()
  const deviceId = await getDeviceId()
  const syncDir = resolveSyncDir(prefs.syncDir)
  let syncDirExists = false
  try {
    await fs.access(syncDir)
    syncDirExists = true
  } catch {
    // doesn't exist yet
  }
  return {
    enabled: prefs.enabled,
    syncDir: prefs.syncDir,
    deviceId,
    lastExportAt: prefs.lastExportAt,
    lastMergeAt: prefs.lastMergeAt,
    syncDirExists
  }
}

export async function setSyncPrefs(patch: Partial<SyncPrefs>): Promise<void> {
  const prefs = await loadSyncPrefs()
  await saveSyncPrefs({ ...prefs, ...patch })
}

// ─────────────────────────────────────────────
// Internal helpers
// ─────────────────────────────────────────────

async function mergeSnapshot(
  localDb: DB,
  masterKey: Buffer,
  snapshotPath: string
): Promise<{ inserted: number; updated: number }> {
  let remoteDb: DB | null = null
  try {
    remoteDb = await openEncryptedDb(snapshotPath, masterKey)

    const remoteRows = remoteDb
      .prepare(
        `SELECT id, title, body, decided_at, review_at, mental_state, situation,
                problem_statement, variables, complications, alternatives,
                range_of_outcomes, expected_outcome, outcome, lessons_learned,
                reviewed_at, created_at, updated_at, is_sample
         FROM decisions`
      )
      .all() as DecisionRow[]

    let inserted = 0
    let updated = 0

    const upsert = localDb.transaction((rows: DecisionRow[]) => {
      const insertStmt = localDb.prepare(`
        INSERT OR IGNORE INTO decisions (
          id, title, body, decided_at, review_at, mental_state, situation,
          problem_statement, variables, complications, alternatives,
          range_of_outcomes, expected_outcome, outcome, lessons_learned,
          reviewed_at, created_at, updated_at, is_sample
        ) VALUES (
          @id, @title, @body, @decided_at, @review_at, @mental_state, @situation,
          @problem_statement, @variables, @complications, @alternatives,
          @range_of_outcomes, @expected_outcome, @outcome, @lessons_learned,
          @reviewed_at, @created_at, @updated_at, @is_sample
        )
      `)

      const updateStmt = localDb.prepare(`
        UPDATE decisions SET
          title             = @title,
          body              = @body,
          decided_at        = @decided_at,
          review_at         = @review_at,
          mental_state      = @mental_state,
          situation         = @situation,
          problem_statement = @problem_statement,
          variables         = @variables,
          complications     = @complications,
          alternatives      = @alternatives,
          range_of_outcomes = @range_of_outcomes,
          expected_outcome  = @expected_outcome,
          outcome           = @outcome,
          lessons_learned   = @lessons_learned,
          reviewed_at       = @reviewed_at,
          updated_at        = @updated_at,
          is_sample         = @is_sample
        WHERE id = @id
          AND @updated_at > updated_at
      `)

      for (const row of rows) {
        const ins = insertStmt.run(row)
        if (ins.changes > 0) {
          inserted++
        } else {
          const upd = updateStmt.run(row)
          if (upd.changes > 0) updated++
        }
      }
    })

    upsert(remoteRows)
    return { inserted, updated }
  } finally {
    closeDb(remoteDb)
  }
}

function resolveSyncDir(dir: string): string {
  if (dir.startsWith('~/')) {
    return join(homedir(), dir.slice(2))
  }
  return dir
}

export type SyncEvent =
  | { type: 'exported'; exportedAt: number }
  | { type: 'merged'; inserted: number; updated: number; mergedAt: number }

function broadcastSyncEvent(evt: SyncEvent): void {
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) {
      win.webContents.send('sync:event', evt)
    }
  }
}

interface DecisionRow {
  id: string
  title: string
  body: string
  decided_at: number | null
  review_at: number | null
  mental_state: string
  situation: string
  problem_statement: string
  variables: string
  complications: string
  alternatives: string
  range_of_outcomes: string
  expected_outcome: string
  outcome: string
  lessons_learned: string
  reviewed_at: number | null
  created_at: number
  updated_at: number | null
  is_sample: number
}
