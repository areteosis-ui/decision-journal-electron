import type Database from 'better-sqlite3-multiple-ciphers'
import { randomUUID } from 'node:crypto'

type DB = Database.Database

const DAY = 1000 * 60 * 60 * 24

const SAMPLE_DECISIONS = [
  {
    title: 'Should I accept the offer to lead the new product line?',
    decidedAt: Date.now() - 45 * DAY,
    reviewAt: Date.now() - 5 * DAY,
    situation:
      'VP offered me the lead role on the new B2B product line. It means leaving my current team mid-cycle.',
    problemStatement:
      'Do I take a bigger role with more uncertainty, or stay in a comfortable position where I know I can deliver?',
    expectedOutcome:
      'I expect the new role to be harder but more fulfilling. 60% chance the product finds traction within 6 months.',
    rangeOfOutcomes:
      'Best case: product takes off and I grow into a GM-type role. Worst case: product gets killed in 6 months and I need to find a new seat.',
    mentalState: '["energized","anxious"]'
  },
  {
    title: 'Moving to a smaller apartment to cut expenses by 40%',
    decidedAt: Date.now() - 90 * DAY,
    reviewAt: Date.now() - 30 * DAY,
    situation:
      'Lease is up in 2 months. Found a place that is smaller but in a better neighborhood, at 40% less rent.',
    problemStatement:
      'Trade space for financial flexibility and a better location, or renew the current lease for stability.',
    expectedOutcome:
      "I'll adjust to the smaller space within a month. The savings will let me max out retirement contributions.",
    rangeOfOutcomes:
      "Best case: love the new neighborhood, barely notice the space difference. Worst case: feel cramped and regret it, but it's only a 12-month lease.",
    mentalState: '["focused","confident"]',
    outcome: 'Moved 6 weeks ago. The smaller space felt tight the first week but the neighborhood is fantastic. Already saved $4,200.',
    outcomeRating: 'better',
    decisionQuality: 'would_repeat',
    calibrationNote: 'I was about right on adjustment time — took 1.5 weeks instead of 1. Underestimated how much the commute improvement would matter.',
    lessonsLearned: 'I tend to overweight "space" as a variable. Location and financial flexibility turned out to matter more for daily satisfaction.',
    reviewedAt: Date.now() - 28 * DAY
  }
]

export function seedIfEmpty(db: DB): void {
  const row = db.prepare('SELECT COUNT(*) as c FROM decisions').get() as { c: number }
  if (row.c > 0) return

  const insert = db.prepare(
    `INSERT INTO decisions (
       id, title, body, decided_at, review_at, mental_state,
       situation, problem_statement, variables, complications, alternatives,
       range_of_outcomes, expected_outcome,
       outcome, outcome_rating, decision_quality, calibration_note, lessons_learned, reviewed_at,
       created_at, updated_at, is_sample
     ) VALUES (
       @id, @title, '', @decidedAt, @reviewAt, @mentalState,
       @situation, @problemStatement, '', '', '',
       @rangeOfOutcomes, @expectedOutcome,
       @outcome, @outcomeRating, @decisionQuality, @calibrationNote, @lessonsLearned, @reviewedAt,
       @createdAt, @updatedAt, 1
     )`
  )

  const tx = db.transaction(() => {
    for (const s of SAMPLE_DECISIONS) {
      const now = s.decidedAt
      insert.run({
        id: randomUUID(),
        title: s.title,
        decidedAt: s.decidedAt,
        reviewAt: s.reviewAt,
        mentalState: s.mentalState,
        situation: s.situation,
        problemStatement: s.problemStatement,
        rangeOfOutcomes: s.rangeOfOutcomes,
        expectedOutcome: s.expectedOutcome,
        outcome: s.outcome ?? '',
        outcomeRating: s.outcomeRating ?? null,
        decisionQuality: s.decisionQuality ?? null,
        calibrationNote: s.calibrationNote ?? '',
        lessonsLearned: s.lessonsLearned ?? '',
        reviewedAt: s.reviewedAt ?? null,
        createdAt: now,
        updatedAt: now
      })
    }
  })
  tx()
}
