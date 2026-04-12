import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Eye, Check } from 'lucide-react'
import type { Decision, DecisionReviewInput, OutcomeRating, DecisionQuality } from '@shared/ipc-contract'
import DecisionReadonly from '../components/DecisionReadonly'

const OUTCOME_OPTIONS: { value: OutcomeRating; label: string }[] = [
  { value: 'worse', label: 'Worse than expected' },
  { value: 'as_expected', label: 'As expected' },
  { value: 'better', label: 'Better than expected' }
]

const QUALITY_OPTIONS: { value: DecisionQuality; label: string }[] = [
  { value: 'would_repeat', label: 'Would repeat' },
  { value: 'would_change', label: 'Would change' }
]

function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  disabled
}: {
  options: { value: T; label: string }[]
  value: T | null
  onChange: (v: T) => void
  disabled?: boolean
}) {
  return (
    <div className="flex gap-0 overflow-hidden rounded-lg border border-border">
      {options.map((opt, i) => (
        <button
          key={opt.value}
          type="button"
          disabled={disabled}
          onClick={() => onChange(opt.value)}
          className={[
            'flex-1 px-3 py-2.5 text-[12.5px] font-medium transition-colors',
            i > 0 ? 'border-l border-border' : '',
            value === opt.value
              ? 'bg-[rgb(var(--accent))] text-accent-text dark:bg-nav-active dark:text-text'
              : 'bg-bg-elevated text-text-muted hover:text-text',
            disabled ? 'cursor-not-allowed opacity-50' : ''
          ].join(' ')}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

export default function ReviewDecision() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [decision, setDecision] = useState<Decision | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [hasReread, setHasReread] = useState(false)
  const [showPrediction, setShowPrediction] = useState(false)
  const [outcome, setOutcome] = useState('')
  const [outcomeRating, setOutcomeRating] = useState<OutcomeRating | null>(null)
  const [decisionQuality, setDecisionQuality] = useState<DecisionQuality | null>(null)
  const [calibrationNote, setCalibrationNote] = useState('')
  const [lessonsLearned, setLessonsLearned] = useState('')

  const isEditing = decision?.reviewedAt !== null && decision?.reviewedAt !== undefined

  const loadDecision = useCallback(async () => {
    if (!id) return
    const d = await window.api.decisions.get(id)
    setDecision(d)
    if (d && d.reviewedAt) {
      setHasReread(true)
      setShowPrediction(true)
      setOutcome(d.outcome)
      setOutcomeRating(d.outcomeRating)
      setDecisionQuality(d.decisionQuality)
      setCalibrationNote(d.calibrationNote)
      setLessonsLearned(d.lessonsLearned)
    }
    setLoading(false)
  }, [id])

  useEffect(() => {
    loadDecision()
  }, [loadDecision])

  const canSave = outcome.trim().length > 0 && outcomeRating !== null && decisionQuality !== null

  async function handleSave() {
    if (!id || !canSave || saving) return
    setSaving(true)
    const input: DecisionReviewInput = {
      outcome: outcome.trim(),
      lessonsLearned: lessonsLearned.trim(),
      outcomeRating,
      decisionQuality,
      calibrationNote: calibrationNote.trim()
    }
    await window.api.decisions.review(id, input)
    navigate('/reviews')
  }

  if (loading) {
    return <div className="mx-auto max-w-[780px] pt-10 text-text-muted">Loading…</div>
  }

  if (!decision) {
    return (
      <div className="mx-auto max-w-[780px] pt-10">
        <p className="text-text-muted">Decision not found.</p>
        <button
          type="button"
          onClick={() => navigate('/reviews')}
          className="mt-4 text-[13px] text-text-muted hover:text-text"
        >
          Back to Reviews
        </button>
      </div>
    )
  }

  const formDisabled = !hasReread

  return (
    <div className="mx-auto max-w-[780px] pb-16">
      <button
        type="button"
        onClick={() => navigate('/reviews')}
        className="mb-6 flex items-center gap-1.5 text-[13px] text-text-muted hover:text-text"
      >
        <ArrowLeft size={14} strokeWidth={2} />
        Back to Reviews
      </button>

      <h1 className="font-serif text-[28px] font-medium leading-tight tracking-tight text-text">
        {isEditing ? 'Editing a saved review' : 'Reviewing a decision'}
      </h1>
      <p className="mt-1 font-serif text-[20px] text-text-muted">{decision.title}</p>

      {/* Original decision (read-only) */}
      <section className="mt-8 rounded-xl border border-border bg-bg-elevated px-6 py-5">
        <h2 className="mb-4 text-[12px] font-semibold uppercase tracking-wide text-text-muted">
          The original decision
        </h2>
        <DecisionReadonly decision={decision} hideExpectedOutcome={!showPrediction} />

        {!showPrediction && (
          <div className="mt-5 flex flex-col items-start gap-3 rounded-lg border border-border/60 bg-bg px-4 py-3">
            <label className="flex items-center gap-2 text-[13px] text-text">
              <input
                type="checkbox"
                checked={hasReread}
                onChange={(e) => setHasReread(e.target.checked)}
                className="h-4 w-4 rounded border-border accent-[rgb(var(--accent))]"
              />
              I've reread this carefully
            </label>
            <button
              type="button"
              disabled={!hasReread}
              onClick={() => setShowPrediction(true)}
              className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-[12.5px] text-text-muted transition-colors hover:text-text disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Eye size={14} strokeWidth={1.75} />
              Show what I predicted
            </button>
            <p className="text-[12px] text-text-muted">
              Take a moment to reread the original before seeing your prediction.
            </p>
          </div>
        )}
      </section>

      {/* Review form */}
      <div className={formDisabled ? 'pointer-events-none mt-8 opacity-40' : 'mt-8'}>
        {/* Outcome */}
        <section>
          <h2 className="text-[12px] font-semibold uppercase tracking-wide text-text-muted">
            What actually happened
          </h2>
          <p className="mt-1 text-[12px] text-text-muted">
            Describe the outcome honestly. Stick to facts first; save interpretation for
            the lessons section.
          </p>
          <textarea
            value={outcome}
            onChange={(e) => setOutcome(e.target.value)}
            disabled={formDisabled}
            rows={4}
            className="mt-2 w-full resize-y rounded-lg border border-border bg-bg-elevated px-4 py-3 text-[14px] leading-relaxed text-text placeholder:text-text-muted/50 focus:border-text-muted focus:outline-none disabled:cursor-not-allowed"
            placeholder="What was the actual result?"
          />
        </section>

        {/* Outcome rating */}
        <section className="mt-6">
          <h2 className="text-[12px] font-semibold uppercase tracking-wide text-text-muted">
            Outcome vs. expectation
          </h2>
          <div className="mt-2">
            <SegmentedControl
              options={OUTCOME_OPTIONS}
              value={outcomeRating}
              onChange={setOutcomeRating}
              disabled={formDisabled}
            />
          </div>
        </section>

        {/* Decision quality */}
        <section className="mt-6">
          <h2 className="text-[12px] font-semibold uppercase tracking-wide text-text-muted">
            Decision quality
          </h2>
          <p className="mt-1 text-[12px] text-text-muted">
            A good decision can have a bad outcome, and vice versa. Judge the process, not the
            result.
          </p>
          <div className="mt-2">
            <SegmentedControl
              options={QUALITY_OPTIONS}
              value={decisionQuality}
              onChange={setDecisionQuality}
              disabled={formDisabled}
            />
          </div>
        </section>

        {/* Calibration note */}
        <section className="mt-6">
          <h2 className="text-[12px] font-semibold uppercase tracking-wide text-text-muted">
            Calibration note
            <span className="ml-1.5 font-normal normal-case tracking-normal">(optional)</span>
          </h2>
          <p className="mt-1 text-[12px] text-text-muted">
            How did your confidence and range of outcomes hold up? Were you over- or
            under-confident?
          </p>
          <textarea
            value={calibrationNote}
            onChange={(e) => setCalibrationNote(e.target.value)}
            disabled={formDisabled}
            rows={3}
            className="mt-2 w-full resize-y rounded-lg border border-border bg-bg-elevated px-4 py-3 text-[14px] leading-relaxed text-text placeholder:text-text-muted/50 focus:border-text-muted focus:outline-none disabled:cursor-not-allowed"
            placeholder="How well-calibrated were your expectations?"
          />
        </section>

        {/* Lessons learned */}
        <section className="mt-6">
          <h2 className="text-[12px] font-semibold uppercase tracking-wide text-text-muted">
            Lessons learned
            <span className="ml-1.5 font-normal normal-case tracking-normal">(optional)</span>
          </h2>
          <p className="mt-1 text-[12px] text-text-muted">
            What patterns did you notice? What will you do differently next time?
          </p>
          <textarea
            value={lessonsLearned}
            onChange={(e) => setLessonsLearned(e.target.value)}
            disabled={formDisabled}
            rows={3}
            className="mt-2 w-full resize-y rounded-lg border border-border bg-bg-elevated px-4 py-3 text-[14px] leading-relaxed text-text placeholder:text-text-muted/50 focus:border-text-muted focus:outline-none disabled:cursor-not-allowed"
            placeholder="What will you carry forward from this decision?"
          />
        </section>

        {/* Actions */}
        <div className="mt-8 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => navigate('/reviews')}
            className="rounded-md px-4 py-2 text-[13px] text-text-muted hover:text-text"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!canSave || saving}
            className="flex items-center gap-2 rounded-lg border border-[rgb(var(--accent))] bg-[rgb(var(--accent))] px-5 py-2.5 text-[13px] font-medium text-accent-text transition-colors hover:opacity-90 disabled:opacity-50 dark:bg-transparent dark:border-border dark:text-text"
          >
            <Check size={15} strokeWidth={2} />
            {saving ? 'Saving…' : 'Save review'}
          </button>
        </div>
      </div>
    </div>
  )
}
