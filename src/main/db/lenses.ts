import type Database from 'better-sqlite3-multiple-ciphers'
import { randomUUID } from 'node:crypto'
import type { LensKind, LensRecord } from '@shared/ipc-contract'
import { LENS_KINDS } from '@shared/ipc-contract'

type DB = Database.Database

interface LensRow {
  id: string
  decision_id: string
  kind: string
  content: string
  model_id: string
  created_at: number
}

function rowToLens(row: LensRow): LensRecord | null {
  if (!LENS_KINDS.includes(row.kind as LensKind)) return null
  return {
    id: row.id,
    decisionId: row.decision_id,
    kind: row.kind as LensKind,
    content: row.content,
    modelId: row.model_id,
    createdAt: row.created_at
  }
}

export function listLensesForDecision(db: DB, decisionId: string): LensRecord[] {
  const rows = db
    .prepare(
      `SELECT id, decision_id, kind, content, model_id, created_at
         FROM decision_lenses
        WHERE decision_id = ?
        ORDER BY created_at DESC`
    )
    .all(decisionId) as LensRow[]
  return rows.map(rowToLens).filter((l): l is LensRecord => l !== null)
}

export function createLens(
  db: DB,
  input: { decisionId: string; kind: LensKind; content: string; modelId: string }
): LensRecord {
  const id = randomUUID()
  const createdAt = Date.now()
  db.prepare(
    `INSERT INTO decision_lenses (id, decision_id, kind, content, model_id, created_at)
     VALUES (@id, @decisionId, @kind, @content, @modelId, @createdAt)`
  ).run({
    id,
    decisionId: input.decisionId,
    kind: input.kind,
    content: input.content,
    modelId: input.modelId,
    createdAt
  })
  return {
    id,
    decisionId: input.decisionId,
    kind: input.kind,
    content: input.content,
    modelId: input.modelId,
    createdAt
  }
}

export function deleteLens(db: DB, id: string): void {
  db.prepare('DELETE FROM decision_lenses WHERE id = ?').run(id)
}
