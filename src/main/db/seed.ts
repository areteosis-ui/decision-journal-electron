import type Database from 'better-sqlite3-multiple-ciphers'
import { randomUUID } from 'node:crypto'

type DB = Database.Database

const SAMPLE_DECISIONS: Array<{ title: string; createdAt: number }> = [
  {
    title: "My country's at war. I'm far from it. I love my country too much to watch it go through this.",
    createdAt: Date.UTC(2026, 2, 3)
  },
  {
    title: 'Finding a nice home that I would feel good at in Tokyo for a few years is difficult.',
    createdAt: Date.UTC(2026, 1, 24)
  }
]

export function seedIfEmpty(db: DB): void {
  const row = db.prepare('SELECT COUNT(*) as c FROM decisions').get() as { c: number }
  if (row.c > 0) return

  const insert = db.prepare(
    `INSERT INTO decisions (id, title, body, created_at, review_at, is_sample)
     VALUES (@id, @title, '', @createdAt, NULL, 1)`
  )
  const tx = db.transaction((rows: typeof SAMPLE_DECISIONS) => {
    for (const r of rows) {
      insert.run({ id: randomUUID(), title: r.title, createdAt: r.createdAt })
    }
  })
  tx(SAMPLE_DECISIONS)
}

export function listDecisions(db: DB) {
  return db
    .prepare(
      `SELECT id, title, body, created_at as createdAt, review_at as reviewAt, is_sample as isSample
       FROM decisions
       ORDER BY created_at DESC`
    )
    .all() as Array<{
    id: string
    title: string
    body: string
    createdAt: number
    reviewAt: number | null
    isSample: 0 | 1
  }>
}
