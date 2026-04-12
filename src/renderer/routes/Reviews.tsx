import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  AlertCircle,
  Calendar,
  ChevronDown,
  ChevronRight,
  Clock,
  CheckCircle2,
  Eye
} from 'lucide-react'
import type { Decision } from '@shared/ipc-contract'
import MicButton from '../components/voice/MicButton'

function formatDate(ts: number): string {
  const d = new Date(ts)
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
}

function daysUntil(ts: number): number {
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const target = new Date(ts)
  target.setHours(0, 0, 0, 0)
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
}

function dueLabel(reviewAt: number | null): string {
  if (reviewAt === null) return 'No review date set'
  const days = daysUntil(reviewAt)
  if (days < 0) return `${Math.abs(days)} day${Math.abs(days) === 1 ? '' : 's'} overdue`
  if (days === 0) return 'Due today'
  if (days === 1) return 'Due tomorrow'
  return `Due in ${days} days`
}

export default function Reviews() {
  const [decisions, setDecisions] = useState<Decision[]>([])
  const [loading, setLoading] = useState(true)
  const [reviewingId, setReviewingId] = useState<string | null>(null)
  const [outcome, setOutcome] = useState('')
  const [lessonsLearned, setLessonsLearned] = useState('')
  const [saving, setSaving] = useState(false)

  const [dueOpen, setDueOpen] = useState(true)
  const [upcomingOpen, setUpcomingOpen] = useState(false)
  const [completedOpen, setCompletedOpen] = useState(false)

  const load = useCallback(async () => {
    const all = await window.api.decisions.list()
    setDecisions(all)
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const now = Date.now()

  const dueForReview = useMemo(
    () =>
      decisions
        .filter((d) => d.reviewAt !== null && d.reviewAt <= now && d.reviewedAt === null)
        .sort((a, b) => (a.reviewAt ?? 0) - (b.reviewAt ?? 0)),
    [decisions, now]
  )

  const upcoming = useMemo(
    () =>
      decisions
        .filter(
          (d) => d.reviewedAt === null && (d.reviewAt === null || d.reviewAt > now)
        )
        .sort((a, b) => (a.reviewAt ?? Infinity) - (b.reviewAt ?? Infinity)),
    [decisions, now]
  )

  const completed = useMemo(
    () =>
      decisions
        .filter((d) => d.reviewedAt !== null)
        .sort((a, b) => (b.reviewedAt ?? 0) - (a.reviewedAt ?? 0)),
    [decisions]
  )

  const startReview = (d: Decision) => {
    setReviewingId(d.id)
    setOutcome(d.outcome || '')
    setLessonsLearned(d.lessonsLearned || '')
  }

  const cancelReview = () => {
    setReviewingId(null)
    setOutcome('')
    setLessonsLearned('')
  }

  const saveReview = async () => {
    if (!reviewingId || saving) return
    setSaving(true)
    try {
      await window.api.decisions.review(reviewingId, { outcome, lessonsLearned })
      setReviewingId(null)
      setOutcome('')
      setLessonsLearned('')
      await load()
    } catch (err) {
      console.error('Failed to save review', err)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="h-full w-full bg-bg" />
  }

  const totalDue = dueForReview.length

  return (
    <div className="mx-auto max-w-[780px] pb-16">
      <div>
        <h1 className="font-serif text-[34px] font-medium leading-tight tracking-tight text-text">
          Reviews
        </h1>
        <p className="mt-1 text-[13px] text-text-muted">
          {totalDue === 0
            ? 'No decisions due for review right now.'
            : `${totalDue} decision${totalDue === 1 ? '' : 's'} due for review`}
        </p>
      </div>

      <div className="mt-8 flex flex-col gap-6">
        <Section
          title="Due for Review"
          count={dueForReview.length}
          open={dueOpen}
          onToggle={() => setDueOpen((v) => !v)}
          icon={<AlertCircle size={16} strokeWidth={1.75} />}
          accentCount
        >
          {dueForReview.length === 0 ? (
            <EmptyState text="All caught up — no decisions due for review." />
          ) : (
            dueForReview.map((d) => (
              <ReviewCard
                key={d.id}
                decision={d}
                reviewing={reviewingId === d.id}
                onStartReview={() => startReview(d)}
                onCancelReview={cancelReview}
                outcome={outcome}
                lessonsLearned={lessonsLearned}
                onOutcomeChange={setOutcome}
                onLessonsLearnedChange={setLessonsLearned}
                onSaveReview={saveReview}
                saving={saving}
                mode="due"
              />
            ))
          )}
        </Section>

        <Section
          title="Upcoming"
          count={upcoming.length}
          open={upcomingOpen}
          onToggle={() => setUpcomingOpen((v) => !v)}
          icon={<Clock size={16} strokeWidth={1.75} />}
        >
          {upcoming.length === 0 ? (
            <EmptyState text="No upcoming reviews scheduled." />
          ) : (
            upcoming.map((d) => (
              <ReviewCard
                key={d.id}
                decision={d}
                reviewing={reviewingId === d.id}
                onStartReview={() => startReview(d)}
                onCancelReview={cancelReview}
                outcome={outcome}
                lessonsLearned={lessonsLearned}
                onOutcomeChange={setOutcome}
                onLessonsLearnedChange={setLessonsLearned}
                onSaveReview={saveReview}
                saving={saving}
                mode="upcoming"
              />
            ))
          )}
        </Section>

        <Section
          title="Completed"
          count={completed.length}
          open={completedOpen}
          onToggle={() => setCompletedOpen((v) => !v)}
          icon={<CheckCircle2 size={16} strokeWidth={1.75} />}
        >
          {completed.length === 0 ? (
            <EmptyState text="No reviews completed yet." />
          ) : (
            completed.map((d) => (
              <ReviewCard
                key={d.id}
                decision={d}
                reviewing={reviewingId === d.id}
                onStartReview={() => startReview(d)}
                onCancelReview={cancelReview}
                outcome={outcome}
                lessonsLearned={lessonsLearned}
                onOutcomeChange={setOutcome}
                onLessonsLearnedChange={setLessonsLearned}
                onSaveReview={saveReview}
                saving={saving}
                mode="completed"
              />
            ))
          )}
        </Section>
      </div>
    </div>
  )
}

function Section({
  title,
  count,
  open,
  onToggle,
  icon,
  accentCount,
  children
}: {
  title: string
  count: number
  open: boolean
  onToggle: () => void
  icon: React.ReactNode
  accentCount?: boolean
  children: React.ReactNode
}) {
  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-2 text-left"
      >
        <span className="text-text-muted">
          {open ? (
            <ChevronDown size={16} strokeWidth={1.75} />
          ) : (
            <ChevronRight size={16} strokeWidth={1.75} />
          )}
        </span>
        <span className="text-text-muted">{icon}</span>
        <span className="text-[14px] font-medium text-text">{title}</span>
        <span
          className={[
            'ml-1 rounded-full px-2 py-0.5 text-[11px] font-medium',
            accentCount && count > 0
              ? 'bg-[rgb(var(--accent))] text-accent-text dark:bg-transparent dark:border dark:border-border dark:text-text'
              : 'bg-border/50 text-text-muted'
          ].join(' ')}
        >
          {count}
        </span>
      </button>
      {open && <div className="mt-3 flex flex-col gap-3">{children}</div>}
    </div>
  )
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-bg-elevated/40 px-6 py-8 text-center">
      <p className="text-[13px] text-text-muted">{text}</p>
    </div>
  )
}

function ReviewCard({
  decision,
  reviewing,
  onStartReview,
  onCancelReview,
  outcome,
  lessonsLearned,
  onOutcomeChange,
  onLessonsLearnedChange,
  onSaveReview,
  saving,
  mode
}: {
  decision: Decision
  reviewing: boolean
  onStartReview: () => void
  onCancelReview: () => void
  outcome: string
  lessonsLearned: string
  onOutcomeChange: (v: string) => void
  onLessonsLearnedChange: (v: string) => void
  onSaveReview: () => void
  saving: boolean
  mode: 'due' | 'upcoming' | 'completed'
}) {
  return (
    <article className="rounded-xl border border-border bg-bg-elevated px-5 py-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[14.5px] leading-relaxed text-text">{decision.title}</p>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-[12px] text-text-muted">
            <span className="flex items-center gap-1">
              <Calendar size={12} strokeWidth={1.75} />
              Decided {formatDate(decision.decidedAt)}
            </span>
            {decision.reviewAt !== null && (
              <span
                className={[
                  'flex items-center gap-1',
                  mode === 'due' ? 'text-[rgb(var(--accent))] dark:text-text font-medium' : ''
                ].join(' ')}
              >
                <Clock size={12} strokeWidth={1.75} />
                {dueLabel(decision.reviewAt)}
              </span>
            )}
            {mode === 'completed' && decision.reviewedAt !== null && (
              <span className="flex items-center gap-1">
                <CheckCircle2 size={12} strokeWidth={1.75} />
                Reviewed {formatDate(decision.reviewedAt)}
              </span>
            )}
          </div>
        </div>
        {!reviewing && (
          <button
            type="button"
            onClick={onStartReview}
            className={[
              'mt-1 flex shrink-0 items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[12.5px] font-medium transition-colors',
              mode === 'due'
                ? 'border-[rgb(var(--accent))] bg-[rgb(var(--accent))] text-accent-text hover:opacity-90 dark:bg-transparent dark:border-border dark:text-text'
                : 'border-border bg-bg text-text-muted hover:text-text hover:border-text/30'
            ].join(' ')}
          >
            <Eye size={13} strokeWidth={1.75} />
            {mode === 'completed' ? 'View / Edit' : 'Write Review'}
          </button>
        )}
      </div>

      {decision.expectedOutcome && !reviewing && (
        <div className="mt-3 rounded-lg bg-bg/60 px-3.5 py-2.5">
          <p className="text-[11px] font-medium uppercase tracking-wide text-text-muted">
            Expected outcome
          </p>
          <p className="mt-1 whitespace-pre-wrap text-[13px] leading-relaxed text-text-muted">
            {decision.expectedOutcome}
          </p>
        </div>
      )}

      {mode === 'completed' && !reviewing && decision.outcome && (
        <div className="mt-3 flex flex-col gap-2">
          <div className="rounded-lg bg-bg/60 px-3.5 py-2.5">
            <p className="text-[11px] font-medium uppercase tracking-wide text-text-muted">
              What actually happened
            </p>
            <p className="mt-1 whitespace-pre-wrap text-[13px] leading-relaxed text-text">
              {decision.outcome}
            </p>
          </div>
          {decision.lessonsLearned && (
            <div className="rounded-lg bg-bg/60 px-3.5 py-2.5">
              <p className="text-[11px] font-medium uppercase tracking-wide text-text-muted">
                Lessons learned
              </p>
              <p className="mt-1 whitespace-pre-wrap text-[13px] leading-relaxed text-text">
                {decision.lessonsLearned}
              </p>
            </div>
          )}
        </div>
      )}

      {reviewing && (
        <ReviewForm
          decision={decision}
          outcome={outcome}
          lessonsLearned={lessonsLearned}
          onOutcomeChange={onOutcomeChange}
          onLessonsLearnedChange={onLessonsLearnedChange}
          onSave={onSaveReview}
          onCancel={onCancelReview}
          saving={saving}
        />
      )}
    </article>
  )
}

function ReviewForm({
  decision,
  outcome,
  lessonsLearned,
  onOutcomeChange,
  onLessonsLearnedChange,
  onSave,
  onCancel,
  saving
}: {
  decision: Decision
  outcome: string
  lessonsLearned: string
  onOutcomeChange: (v: string) => void
  onLessonsLearnedChange: (v: string) => void
  onSave: () => void
  onCancel: () => void
  saving: boolean
}) {
  const outcomeRef = useRef<HTMLTextAreaElement>(null)
  const lessonsRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const el = outcomeRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.max(el.scrollHeight, 5 * 24)}px`
  }, [outcome])

  useEffect(() => {
    const el = lessonsRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.max(el.scrollHeight, 4 * 24)}px`
  }, [lessonsLearned])

  const handleOutcomeInsert = useCallback(
    (text: string) => {
      const el = outcomeRef.current
      if (el && el === document.activeElement) {
        const start = el.selectionStart ?? outcome.length
        const end = el.selectionEnd ?? outcome.length
        onOutcomeChange(outcome.slice(0, start) + text + outcome.slice(end))
      } else {
        onOutcomeChange(outcome ? outcome + '\n' + text : text)
      }
    },
    [outcome, onOutcomeChange]
  )

  const handleLessonsInsert = useCallback(
    (text: string) => {
      const el = lessonsRef.current
      if (el && el === document.activeElement) {
        const start = el.selectionStart ?? lessonsLearned.length
        const end = el.selectionEnd ?? lessonsLearned.length
        onLessonsLearnedChange(
          lessonsLearned.slice(0, start) + text + lessonsLearned.slice(end)
        )
      } else {
        onLessonsLearnedChange(lessonsLearned ? lessonsLearned + '\n' + text : text)
      }
    },
    [lessonsLearned, onLessonsLearnedChange]
  )

  return (
    <div className="mt-4 border-t border-border pt-4">
      {decision.expectedOutcome && (
        <div className="mb-4 rounded-lg bg-bg/60 px-3.5 py-2.5">
          <p className="text-[11px] font-medium uppercase tracking-wide text-text-muted">
            What you expected
          </p>
          <p className="mt-1 whitespace-pre-wrap text-[13px] leading-relaxed text-text-muted">
            {decision.expectedOutcome}
          </p>
        </div>
      )}

      <div className="flex flex-col gap-4">
        <label className="flex flex-col gap-1.5">
          <span className="text-[13px] font-medium text-text">
            What actually happened?
          </span>
          <div className="relative">
            <textarea
              ref={outcomeRef}
              value={outcome}
              onChange={(e) => onOutcomeChange(e.target.value)}
              rows={5}
              autoFocus
              placeholder="Describe the actual outcome..."
              className="w-full resize-none rounded-xl border border-border bg-bg px-3.5 py-3 pr-10 text-[14px] leading-relaxed text-text placeholder:text-text-muted focus:border-text/40 focus:outline-none focus:ring-2 focus:ring-text/10"
            />
            <div className="absolute bottom-2 right-2">
              <MicButton onInsert={handleOutcomeInsert} />
            </div>
          </div>
          <span className="mt-1 text-[12px] leading-snug text-text-muted">
            Compare reality against what you predicted. Be honest — that's the whole point.
          </span>
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-[13px] font-medium text-text">
            What did you learn?
          </span>
          <div className="relative">
            <textarea
              ref={lessonsRef}
              value={lessonsLearned}
              onChange={(e) => onLessonsLearnedChange(e.target.value)}
              rows={4}
              placeholder="What would you do differently? What assumptions were wrong?"
              className="w-full resize-none rounded-xl border border-border bg-bg px-3.5 py-3 pr-10 text-[14px] leading-relaxed text-text placeholder:text-text-muted focus:border-text/40 focus:outline-none focus:ring-2 focus:ring-text/10"
            />
            <div className="absolute bottom-2 right-2">
              <MicButton onInsert={handleLessonsInsert} />
            </div>
          </div>
          <span className="mt-1 text-[12px] leading-snug text-text-muted">
            Focus on process, not just results. A good outcome from bad reasoning is still worth noting.
          </span>
        </label>
      </div>

      <div className="mt-5 flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-border bg-bg-elevated px-4 py-2 text-[13px] text-text hover:bg-nav-active"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onSave}
          disabled={saving || !outcome.trim()}
          className="flex items-center gap-2 rounded-lg border border-[rgb(var(--accent))] bg-[rgb(var(--accent))] px-4 py-2 text-[13px] font-medium text-accent-text transition-colors hover:opacity-90 disabled:opacity-40 dark:bg-transparent dark:border-border dark:text-text"
        >
          <CheckCircle2 size={14} strokeWidth={2} />
          {saving ? 'Saving...' : 'Save Review'}
        </button>
      </div>
    </div>
  )
}
