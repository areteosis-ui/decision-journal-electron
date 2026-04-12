import { Calendar, Brain } from 'lucide-react'
import type { Decision } from '@shared/ipc-contract'
import { MENTAL_STATE_LABELS } from '@shared/ipc-contract'

function formatDate(ts: number): string {
  const d = new Date(ts)
  const month = d.toLocaleString('en-US', { month: 'long' })
  return `${month} ${d.getDate()}, ${d.getFullYear()}`
}

interface Props {
  decision: Decision
  hideExpectedOutcome?: boolean
}

function Section({ label, text }: { label: string; text: string }) {
  if (!text) return null
  return (
    <div>
      <h3 className="text-[12px] font-semibold uppercase tracking-wide text-text-muted">
        {label}
      </h3>
      <p className="mt-1.5 whitespace-pre-wrap text-[14px] leading-relaxed text-text">{text}</p>
    </div>
  )
}

export default function DecisionReadonly({ decision, hideExpectedOutcome }: Props) {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[12.5px] text-text-muted">
        <span className="flex items-center gap-1.5">
          <Calendar size={13} strokeWidth={1.75} />
          Decided {formatDate(decision.decidedAt)}
        </span>
        {decision.reviewAt && (
          <span className="flex items-center gap-1.5">
            <Calendar size={13} strokeWidth={1.75} />
            Review by {formatDate(decision.reviewAt)}
          </span>
        )}
      </div>

      {decision.mentalState.length > 0 && (
        <div>
          <h3 className="text-[12px] font-semibold uppercase tracking-wide text-text-muted">
            Mental state at time of decision
          </h3>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {decision.mentalState.map((s) => (
              <span
                key={s}
                className="inline-flex items-center gap-1 rounded-full border border-border bg-bg px-2.5 py-0.5 text-[12px] text-text-muted"
              >
                <Brain size={11} strokeWidth={1.75} />
                {MENTAL_STATE_LABELS[s]}
              </span>
            ))}
          </div>
        </div>
      )}

      <Section label="Situation" text={decision.situation} />
      <Section label="Problem statement" text={decision.problemStatement} />
      <Section label="Key variables" text={decision.variables} />
      <Section label="Complications" text={decision.complications} />
      <Section label="Alternatives considered" text={decision.alternatives} />
      <Section label="Range of outcomes" text={decision.rangeOfOutcomes} />

      {!hideExpectedOutcome && (
        <Section label="Expected outcome" text={decision.expectedOutcome} />
      )}
    </div>
  )
}
