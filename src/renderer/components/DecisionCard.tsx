import { CheckCircle2, Calendar, Clock } from 'lucide-react'
import type { Decision } from '@shared/ipc-contract'

function formatDate(ts: number): string {
  const d = new Date(ts)
  const month = d.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' })
  return `${month} ${d.getUTCDate()}, ${d.getUTCFullYear()}`
}

function ReviewBadge({ decision }: { decision: Decision }) {
  if (decision.reviewedAt) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-bg px-2 py-0.5 text-[11px] font-medium text-text-muted ring-1 ring-border">
        <CheckCircle2 size={11} strokeWidth={2} />
        Reviewed
      </span>
    )
  }
  if (decision.reviewAt && decision.reviewAt <= Date.now()) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-[rgb(var(--accent))]/10 px-2 py-0.5 text-[11px] font-medium text-[rgb(var(--accent))] dark:bg-nav-active dark:text-text">
        <Clock size={11} strokeWidth={2} />
        Review due
      </span>
    )
  }
  return null
}

export default function DecisionCard({ decision }: { decision: Decision }) {
  return (
    <article className="rounded-xl border border-border bg-bg-elevated px-5 py-4 shadow-[0_1px_2px_rgb(0_0_0_/0.02)] transition-colors hover:bg-bg-elevated/80">
      <div className="flex items-start gap-3">
        <CheckCircle2
          size={18}
          strokeWidth={1.75}
          className="mt-0.5 shrink-0 text-text-muted"
        />
        <div className="min-w-0 flex-1">
          <p className="pr-4 text-[14.5px] leading-relaxed text-text">{decision.title}</p>
          <div className="mt-2 flex items-center gap-2">
            <div className="flex items-center gap-1.5 text-[12px] text-text-muted">
              <Calendar size={13} strokeWidth={1.75} />
              <span>{formatDate(decision.decidedAt)}</span>
            </div>
            <ReviewBadge decision={decision} />
          </div>
        </div>
      </div>
    </article>
  )
}
