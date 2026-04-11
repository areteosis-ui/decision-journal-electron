import type Database from 'better-sqlite3-multiple-ciphers'
import type { DecisionCreateInput } from '@shared/ipc-contract'
import { countDecisions, createDecision } from './decisions'

type DB = Database.Database

const SIX_MONTHS_MS = 1000 * 60 * 60 * 24 * 182

const SAMPLE_DECISIONS: DecisionCreateInput[] = [
  {
    title:
      "My country's at war. I'm far from it. I love my country too much to watch it go through this.",
    decidedAt: Date.UTC(2026, 2, 3, 9, 0),
    reviewAt: Date.UTC(2026, 2, 3, 9, 0) + SIX_MONTHS_MS,
    mentalState: ['anxious', 'tired', 'resigned'],
    situation:
      'Living abroad while my home country is in an active war. News cycle is relentless and family there is safe for now but nothing is guaranteed.',
    problemStatement:
      'Do I stay where I am, return to help, or find a third path that lets me contribute meaningfully without putting myself in harm\u2019s way?',
    variables:
      'Family safety, my own income, visa status, psychological toll of watching from afar, what I can actually do from abroad.',
    complications:
      'Returning might put me at risk without actually helping. Staying feels selfish. Guilt is clouding my judgment.',
    alternatives:
      'Return home. Fundraise from abroad. Volunteer remotely with aid orgs. Take a sabbatical to focus on helping from afar.',
    rangeOfOutcomes:
      'Best case: I channel this into something useful and help meaningfully. Worst case: I burn out and help nobody.',
    expectedOutcome:
      'Most likely (~60%) I stay abroad and fundraise / volunteer remotely for six months, then re-evaluate.'
  },
  {
    title: 'Finding a nice home that I would feel good at in Tokyo for a few years is difficult.',
    decidedAt: Date.UTC(2026, 1, 24, 14, 30),
    reviewAt: Date.UTC(2026, 1, 24, 14, 30) + SIX_MONTHS_MS,
    mentalState: ['focused', 'frustrated'],
    situation:
      'Looking for a medium-term rental in Tokyo. Budget is fine but the inventory that matches what I actually want is tiny and moves fast.',
    problemStatement:
      'Compromise on location, size, or aesthetics \u2014 which one do I give up to get the other two?',
    variables:
      'Commute to meetings in Shibuya, natural light, quiet street, pet-friendly, lease flexibility, furnished vs. unfurnished.',
    complications:
      'The places I like keep going under contract before I can view them. Agents are pushing me toward compromises I will regret.',
    alternatives:
      'Short-term serviced apartment for 3 months to take pressure off. Hire a bilingual agent. Expand the search to Meguro/Setagaya.',
    rangeOfOutcomes:
      'Best case: I find a great place within 4 weeks and settle in. Worst case: I panic-sign a bad lease and resent it for a year.',
    expectedOutcome:
      'Probably (~50%) I bridge with a 2\u20133 month serviced apartment and keep looking without the time pressure.'
  }
]

export function seedIfEmpty(db: DB): void {
  if (countDecisions(db) > 0) return
  const tx = db.transaction((rows: DecisionCreateInput[]) => {
    for (const r of rows) createDecision(db, r, 1)
  })
  tx(SAMPLE_DECISIONS)
}
