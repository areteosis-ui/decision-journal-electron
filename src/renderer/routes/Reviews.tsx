import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Clock, ArrowRight, ChevronDown, PlusCircle } from 'lucide-react'
import type { Decision } from '@shared/ipc-contract'

function formatRelativeDate(ts: number): string {
  const now = Date.now()
  const diffMs = now - ts
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  if (days < 0) {
    const absDays = Math.abs(days)
    if (absDays === 0) return 'Due today'
    if (absDays === 1) return 'Due tomorrow'
    if (absDays < 7) return `Due in ${absDays} days`
    if (absDays < 30) return `Due in ${Math.floor(absDays / 7)} week${Math.floor(absDays / 7) === 1 ? '' : 's'}`
    return `Due in ${Math.floor(absDays / 30)} month${Math.floor(absDays / 30) === 1 ? '' : 's'}`
  }
  if (days === 0) return 'Due today'
  if (days === 1) return 'Due yesterday'
  if (days < 7) return `${days} days overdue`
  if (days < 30) return `${Math.floor(days / 7)} week${Math.floor(days / 7) === 1 ? '' : 's'} overdue`
  return `${Math.floor(days / 30)} month${Math.floor(days / 30) === 1 ? '' : 's'} overdue`
}

function ReviewCard({
  decision,
  variant,
  onReview
}: {
  decision: Decision
  variant: 'ready' | 'upcoming'
  onReview: (id: string) => void
}) {
  const isReady = variant === 'ready'
  return (
    <article
      className={[
        'rounded-xl border bg-bg-elevated px-5 py-4 transition-colors',
        isReady ? 'border-border shadow-[0_1px_2px_rgb(0_0_0_/0.02)]' : 'border-border/60'
      ].join(' ')}
    >
      <div className="flex items-start gap-3">
        <Clock
          size={18}
          strokeWidth={1.75}
          className={[
            'mt-0.5 shrink-0',
            isReady ? 'text-[rgb(var(--accent))]' : 'text-text-muted'
          ].join(' ')}
        />
        <div className="min-w-0 flex-1">
          <p className="text-[14.5px] leading-relaxed text-text">{decision.title}</p>
          {decision.reviewAt && (
            <p
              className={[
                'mt-1 text-[12px]',
                isReady ? 'font-medium text-[rgb(var(--accent))]' : 'text-text-muted'
              ].join(' ')}
            >
              {formatRelativeDate(decision.reviewAt)}
            </p>
          )}
        </div>
        {isReady && (
          <button
            type="button"
            onClick={() => onReview(decision.id)}
            className="flex shrink-0 items-center gap-1.5 rounded-lg border border-[rgb(var(--accent))] bg-[rgb(var(--accent))] px-3.5 py-2 text-[12.5px] font-medium text-accent-text transition-colors hover:opacity-90 dark:bg-transparent dark:border-border dark:text-text"
          >
            Review now
            <ArrowRight size={13} strokeWidth={2} />
          </button>
        )}
      </div>
    </article>
  )
}

export default function Reviews() {
  const navigate = useNavigate()
  const [reviewable, setReviewable] = useState<Decision[]>([])
  const [upcoming, setUpcoming] = useState<Decision[]>([])
  const [showAllUpcoming, setShowAllUpcoming] = useState(false)

  const refresh = useCallback(async () => {
    const [r, u] = await Promise.all([
      window.api.decisions.listReviewable(),
      window.api.decisions.listUpcoming()
    ])
    setReviewable(r)
    setUpcoming(u)
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const handleReview = (id: string) => navigate(`/decisions/${id}/review`)

  const hasNothing = reviewable.length === 0 && upcoming.length === 0

  return (
    <div className="mx-auto max-w-[780px] pb-10">
      <h1 className="font-serif text-[34px] font-medium leading-tight tracking-tight text-text">
        Reviews
      </h1>
      <p className="mt-1 text-[13px] text-text-muted">
        Revisit past decisions, record outcomes, and learn from your process.
      </p>

      {hasNothing ? (
        <div className="mt-16 rounded-2xl border border-dashed border-border bg-bg-elevated/40 px-8 py-16 text-center">
          <p className="font-serif text-[22px] text-text">Nothing to review yet</p>
          <p className="mt-2 text-[13px] text-text-muted">
            Decisions you schedule for review will appear here when their date arrives.
          </p>
          <button
            type="button"
            onClick={() => navigate('/new')}
            className="mt-6 inline-flex items-center gap-2 rounded-lg border border-[rgb(var(--accent))] bg-[rgb(var(--accent))] px-4 py-2.5 text-[13px] font-medium text-accent-text transition-colors hover:opacity-90 dark:bg-transparent dark:border-border dark:text-text"
          >
            <PlusCircle size={15} strokeWidth={2} />
            New Decision
          </button>
        </div>
      ) : (
        <>
          {reviewable.length > 0 && (
            <section className="mt-8">
              <h2 className="mb-3 text-[13px] font-semibold uppercase tracking-wide text-text-muted">
                Ready to review
              </h2>
              <div className="flex flex-col gap-3">
                {reviewable.map((d) => (
                  <ReviewCard
                    key={d.id}
                    decision={d}
                    variant="ready"
                    onReview={handleReview}
                  />
                ))}
              </div>
            </section>
          )}

          {upcoming.length > 0 && (
            <section className="mt-8">
              <h2 className="mb-3 text-[13px] font-semibold uppercase tracking-wide text-text-muted">
                Upcoming
              </h2>
              <div className="flex flex-col gap-2">
                {(showAllUpcoming ? upcoming : upcoming.slice(0, 5)).map((d) => (
                  <ReviewCard
                    key={d.id}
                    decision={d}
                    variant="upcoming"
                    onReview={handleReview}
                  />
                ))}
              </div>
              {upcoming.length > 5 && !showAllUpcoming && (
                <button
                  type="button"
                  onClick={() => setShowAllUpcoming(true)}
                  className="mt-2 flex items-center gap-1 text-[12.5px] text-text-muted hover:text-text"
                >
                  <ChevronDown size={14} strokeWidth={1.75} />
                  Show {upcoming.length - 5} more
                </button>
              )}
            </section>
          )}
        </>
      )}
    </div>
  )
}
