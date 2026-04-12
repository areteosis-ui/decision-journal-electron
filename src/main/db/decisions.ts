import type Database from 'better-sqlite3-multiple-ciphers'
import { randomUUID } from 'node:crypto'
import type {
  Decision,
  DecisionCreateInput,
  DecisionReviewInput,
  DecisionUpdateInput,
  MentalState
} from '@shared/ipc-contract'
import { MENTAL_STATES } from '@shared/ipc-contract'

type DB = Database.Database

interface DecisionRow {
  id: string
  title: string
  decided_at: number
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
  outcome_rating: string | null
  decision_quality: string | null
  calibration_note: string
  lessons_learned: string
  reviewed_at: number | null
  created_at: number
  updated_at: number | null
  is_sample: number
}

function parseMentalState(raw: string): MentalState[] {
  try {
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (s): s is MentalState =>
        typeof s === 'string' && (MENTAL_STATES as readonly string[]).includes(s)
    )
  } catch {
    return []
  }
}

function rowToDecision(row: DecisionRow): Decision {
  return {
    id: row.id,
    title: row.title,
    decidedAt: row.decided_at ?? row.created_at,
    reviewAt: row.review_at,
    mentalState: parseMentalState(row.mental_state),
    situation: row.situation ?? '',
    problemStatement: row.problem_statement ?? '',
    variables: row.variables ?? '',
    complications: row.complications ?? '',
    alternatives: row.alternatives ?? '',
    rangeOfOutcomes: row.range_of_outcomes ?? '',
    expectedOutcome: row.expected_outcome ?? '',
    outcome: row.outcome ?? '',
    outcomeRating: (row.outcome_rating as Decision['outcomeRating']) ?? null,
    decisionQuality: (row.decision_quality as Decision['decisionQuality']) ?? null,
    calibrationNote: row.calibration_note ?? '',
    lessonsLearned: row.lessons_learned ?? '',
    reviewedAt: row.reviewed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at ?? row.created_at,
    isSample: row.is_sample ? 1 : 0
  }
}

const SELECT_ALL = `
  SELECT id, title, decided_at, review_at, mental_state, situation, problem_statement,
         variables, complications, alternatives, range_of_outcomes, expected_outcome,
         outcome, outcome_rating, decision_quality, calibration_note,
         lessons_learned, reviewed_at, created_at, updated_at, is_sample
  FROM decisions
`

export function listDecisions(db: DB): Decision[] {
  const rows = db
    .prepare(`${SELECT_ALL} ORDER BY COALESCE(decided_at, created_at) DESC, created_at DESC`)
    .all() as DecisionRow[]
  return rows.map(rowToDecision)
}

export function getDecision(db: DB, id: string): Decision | null {
  const row = db.prepare(`${SELECT_ALL} WHERE id = ?`).get(id) as DecisionRow | undefined
  return row ? rowToDecision(row) : null
}

export function createDecision(db: DB, input: DecisionCreateInput, isSample = 0): Decision {
  const id = randomUUID()
  const now = Date.now()
  db.prepare(
    `INSERT INTO decisions (
       id, title, decided_at, review_at, mental_state, situation, problem_statement,
       variables, complications, alternatives, range_of_outcomes, expected_outcome,
       outcome, outcome_rating, decision_quality, calibration_note,
       lessons_learned, reviewed_at, created_at, updated_at, is_sample, body
     ) VALUES (
       @id, @title, @decidedAt, @reviewAt, @mentalState, @situation, @problemStatement,
       @variables, @complications, @alternatives, @rangeOfOutcomes, @expectedOutcome,
       '', NULL, NULL, '', '', NULL, @createdAt, @updatedAt, @isSample, ''
     )`
  ).run({
    id,
    title: input.title,
    decidedAt: input.decidedAt,
    reviewAt: input.reviewAt,
    mentalState: JSON.stringify(input.mentalState ?? []),
    situation: input.situation ?? '',
    problemStatement: input.problemStatement ?? '',
    variables: input.variables ?? '',
    complications: input.complications ?? '',
    alternatives: input.alternatives ?? '',
    rangeOfOutcomes: input.rangeOfOutcomes ?? '',
    expectedOutcome: input.expectedOutcome ?? '',
    createdAt: now,
    updatedAt: now,
    isSample
  })
  const created = getDecision(db, id)
  if (!created) throw new Error('Failed to read back created decision')
  return created
}

const PATCH_COLUMNS: Record<keyof DecisionUpdateInput, string> = {
  title: 'title',
  decidedAt: 'decided_at',
  reviewAt: 'review_at',
  mentalState: 'mental_state',
  situation: 'situation',
  problemStatement: 'problem_statement',
  variables: 'variables',
  complications: 'complications',
  alternatives: 'alternatives',
  rangeOfOutcomes: 'range_of_outcomes',
  expectedOutcome: 'expected_outcome'
}

export function updateDecision(db: DB, id: string, patch: DecisionUpdateInput): Decision {
  const sets: string[] = []
  const values: Record<string, unknown> = { id, updatedAt: Date.now() }

  for (const key of Object.keys(patch) as Array<keyof DecisionUpdateInput>) {
    const col = PATCH_COLUMNS[key]
    if (!col) continue
    const value = patch[key]
    if (key === 'mentalState') {
      sets.push(`${col} = @${key}`)
      values[key] = JSON.stringify(value ?? [])
    } else {
      sets.push(`${col} = @${key}`)
      values[key] = value
    }
  }

  sets.push('updated_at = @updatedAt')

  db.prepare(`UPDATE decisions SET ${sets.join(', ')} WHERE id = @id`).run(values)

  const updated = getDecision(db, id)
  if (!updated) throw new Error('Decision not found after update')
  return updated
}

export function deleteDecision(db: DB, id: string): void {
  db.prepare('DELETE FROM decisions WHERE id = ?').run(id)
}

export function reviewDecision(db: DB, id: string, input: DecisionReviewInput): Decision {
  const now = Date.now()
  db.prepare(
    `UPDATE decisions SET
       outcome = @outcome,
       lessons_learned = @lessonsLearned,
       outcome_rating = @outcomeRating,
       decision_quality = @decisionQuality,
       calibration_note = @calibrationNote,
       reviewed_at = @reviewedAt,
       updated_at = @updatedAt
     WHERE id = @id`
  ).run({
    id,
    outcome: input.outcome,
    lessonsLearned: input.lessonsLearned,
    outcomeRating: input.outcomeRating,
    decisionQuality: input.decisionQuality,
    calibrationNote: input.calibrationNote,
    reviewedAt: now,
    updatedAt: now
  })
  const updated = getDecision(db, id)
  if (!updated) throw new Error('Decision not found after review')
  return updated
}

export function clearReviewDecision(db: DB, id: string): Decision {
  const now = Date.now()
  db.prepare(
    `UPDATE decisions SET
       outcome = '',
       lessons_learned = '',
       outcome_rating = NULL,
       decision_quality = NULL,
       calibration_note = '',
       reviewed_at = NULL,
       updated_at = @updatedAt
     WHERE id = @id`
  ).run({ id, updatedAt: now })
  const updated = getDecision(db, id)
  if (!updated) throw new Error('Decision not found after clearing review')
  return updated
}

export function listReviewable(db: DB): Decision[] {
  const now = Date.now()
  const rows = db
    .prepare(
      `${SELECT_ALL} WHERE review_at IS NOT NULL AND review_at <= ? AND reviewed_at IS NULL ORDER BY review_at ASC`
    )
    .all(now) as DecisionRow[]
  return rows.map(rowToDecision)
}

export function listUpcoming(db: DB): Decision[] {
  const now = Date.now()
  const rows = db
    .prepare(
      `${SELECT_ALL} WHERE review_at IS NOT NULL AND review_at > ? AND reviewed_at IS NULL ORDER BY review_at ASC LIMIT 10`
    )
    .all(now) as DecisionRow[]
  return rows.map(rowToDecision)
}

export function countDecisions(db: DB): number {
  const row = db.prepare('SELECT COUNT(*) as c FROM decisions').get() as { c: number }
  return row.c
}
