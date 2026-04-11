import { CheckCircle2, Calendar, ChevronDown } from 'lucide-react'
import type { Decision } from '@shared/ipc-contract'

function formatDate(ts: number): string {
  const d = new Date(ts)
  const month = d.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' })
  return `${month} ${d.getUTCDate()}, ${d.getUTCFullYear()}`
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
        <p className="flex-1 pr-4 text-[14.5px] leading-relaxed text-text">{decision.title}</p>
        <div className="flex shrink-0 items-center gap-1.5 pt-0.5 text-[12px] text-text-muted">
          <Calendar size={13} strokeWidth={1.75} />
          <span>{formatDate(decision.createdAt)}</span>
        </div>
      </div>
      <button
        type="button"
        className="mt-3 flex w-full items-center justify-center text-text-muted hover:text-text"
        aria-label="Expand"
      >
        <ChevronDown size={16} strokeWidth={1.75} />
      </button>
    </article>
  )
}
