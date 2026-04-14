import type { Decision, DecisionOption, LensKind } from '@shared/ipc-contract'
import { parseAlternatives } from '@shared/ipc-contract'
import type { ChatMessageIn } from './client'

const BASE_PERSONA = `You are a thoughtful decision-journal coach analyzing ONE decision from a specific angle. You run fully on-device — the user trusts you with their private writing. Be concrete, direct, and honest. Do not moralize. Do not pad. Use the user's own words where it makes your point sharper.`

function formatOptionsBlock(d: Decision): string {
  const parsed = parseAlternatives(d.alternatives)
  if (parsed.kind === 'structured' && parsed.options.length > 0) {
    return parsed.options
      .map((o: DecisionOption, i: number) => {
        const marker = o.chosen ? ' (CHOSEN)' : ''
        const name = o.name.trim() || `Option ${i + 1}`
        const note = o.note.trim() ? `\n    ${o.note.trim().replace(/\n/g, '\n    ')}` : ''
        return `  - ${name}${marker}${note}`
      })
      .join('\n')
  }
  if (parsed.kind === 'legacy') {
    return `  (legacy free-text notes)\n    ${parsed.text.replace(/\n/g, '\n    ')}`
  }
  return '  (none listed)'
}

function formatMentalState(d: Decision): string {
  return d.mentalState.length > 0 ? d.mentalState.join(', ') : '(not specified)'
}

function formatDate(ms: number | null): string {
  if (ms == null) return '(not set)'
  return new Date(ms).toISOString().slice(0, 10)
}

function buildDecisionContext(d: Decision): string {
  return [
    `Title: ${d.title}`,
    `Decided at: ${formatDate(d.decidedAt)}`,
    `Review date: ${formatDate(d.reviewAt)}`,
    `Mental state when deciding: ${formatMentalState(d)}`,
    '',
    `Situation / context:\n${d.situation || '(empty)'}`,
    '',
    `Problem frame:\n${d.problemStatement || '(empty)'}`,
    '',
    `Variables governing the outcome:\n${d.variables || '(empty)'}`,
    '',
    `Complications:\n${d.complications || '(empty)'}`,
    '',
    `Options considered:\n${formatOptionsBlock(d)}`,
    '',
    `Range of outcomes:\n${d.rangeOfOutcomes || '(empty)'}`,
    '',
    `Expected outcome (with probabilities):\n${d.expectedOutcome || '(empty)'}`
  ].join('\n')
}

const LENS_INSTRUCTIONS: Record<LensKind, string> = {
  'opportunity-cost': `Analyze this decision through the **Opportunity Cost** lens.

Focus on what the user is giving up by picking the option they picked — the value of the next-best alternative they listed. Think in terms of:
1. What concrete value does the chosen option hand up that the rejected options would have delivered?
2. Which hidden costs did the user not mention in their write-up? (career optionality, relationships, learning velocity, time, money, energy, reputation, reversibility)
3. Point to ONE specific claim in the user's own write-up that deserves a harder push-back. Quote the user back to themselves.

End with a single pointed question that would make the user uncomfortable in a useful way. No more than four short sections.`,

  'pre-mortem': `Run a **Pre-mortem** on this decision.

Assume it is 12 months from now and this decision has clearly failed. Walk the user through:
1. The 2–3 most likely failure modes, ranked by how plausible they are given what the user wrote about their situation and mental state.
2. For each failure mode: the earliest observable warning sign the user could look for between now and then.
3. One thing the user could do THIS WEEK to de-risk the most likely failure mode without abandoning the decision.

Be concrete. Reference the user's own complications and variables. Do not hedge.`,

  'regret-minimization': `Run a **Regret Minimization** analysis (Bezos-style: project to the long term and look backward).

Project the user ten years into the future, looking back at this decision. Address:
1. Which option, looking backward from ten years out, would the user most likely regret NOT choosing? Give your reasoning from what they wrote.
2. Is the regret the user should be minimizing short-term (next 1–2 years) or long-term (5+ years)? How do you know from their write-up?
3. Name one thing the user is weighting too heavily right now that a ten-years-older version of them would downweight.
4. One question the ten-years-older version would ask today's user.

Keep it human. Do not turn this into a spreadsheet.`,

  'counterparty-incentives': `Analyze this decision through the **Counterparty Incentives** lens.

The user is modeling this as a solo choice, but rarely is it one. Walk through:
1. Who else has real skin in this outcome? List them (people, teams, organizations, future selves).
2. For each counterparty: what are their incentives, and how do those incentives shift the actual payoff the user should expect (not the one they wrote down)?
3. Which counterparty's incentives are most misaligned with the user's, and how would that misalignment show up in the next 3–6 months?
4. One move the user could make right now that accounts for the misalignment they are currently ignoring.

This is the game-theoretic lens. Be rigorous but plain-spoken.`
}

export function buildLensMessages(decision: Decision, kind: LensKind): ChatMessageIn[] {
  const context = buildDecisionContext(decision)
  const instructions = LENS_INSTRUCTIONS[kind]

  const system = `${BASE_PERSONA}\n\nYou will be given one decision the user has written down, and a specific lens to analyze it through. Stay within that lens. Do not summarize the decision back to the user — they wrote it, they know what it says.`

  const user = `Here is the decision. Analyze it through the lens described at the end.\n\n${context}\n\n---\n\n${instructions}`

  return [
    { role: 'system', content: system },
    { role: 'user', content: user }
  ]
}
