import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Check } from 'lucide-react'
import {
  MENTAL_STATES,
  MENTAL_STATE_LABELS,
  type DecisionCreateInput,
  type MentalState
} from '@shared/ipc-contract'

function pad(n: number): string {
  return n.toString().padStart(2, '0')
}

function toLocalDateTimeString(ms: number): string {
  const d = new Date(ms)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`
}

function toLocalDateString(ms: number): string {
  const d = new Date(ms)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function fromLocalDateTime(s: string): number {
  const ms = new Date(s).getTime()
  return Number.isFinite(ms) ? ms : Date.now()
}

function fromLocalDate(s: string): number {
  const ms = new Date(`${s}T12:00`).getTime()
  return Number.isFinite(ms) ? ms : Date.now()
}

const SIX_MONTHS_MS = 1000 * 60 * 60 * 24 * 182

function TextArea({
  label,
  helper,
  value,
  onChange,
  placeholder,
  rows = 3,
  required
}: {
  label: string
  helper?: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  rows?: number
  required?: boolean
}) {
  return (
    <div>
      <label className="text-[12px] font-semibold uppercase tracking-wide text-text-muted">
        {label}
        {required && <span className="ml-0.5 text-text-muted/60">*</span>}
      </label>
      {helper && <p className="mt-0.5 text-[12px] text-text-muted">{helper}</p>}
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        placeholder={placeholder}
        className="mt-1.5 w-full resize-y rounded-lg border border-border bg-bg-elevated px-4 py-3 text-[14px] leading-relaxed text-text placeholder:text-text-muted/50 focus:border-text-muted focus:outline-none"
      />
    </div>
  )
}

export default function NewDecision() {
  const navigate = useNavigate()
  const now = Date.now()

  const [title, setTitle] = useState('')
  const [decidedAt, setDecidedAt] = useState(toLocalDateTimeString(now))
  const [reviewAt, setReviewAt] = useState(toLocalDateString(now + SIX_MONTHS_MS))
  const [mentalState, setMentalState] = useState<MentalState[]>([])
  const [situation, setSituation] = useState('')
  const [problemStatement, setProblemStatement] = useState('')
  const [variables, setVariables] = useState('')
  const [complications, setComplications] = useState('')
  const [alternatives, setAlternatives] = useState('')
  const [rangeOfOutcomes, setRangeOfOutcomes] = useState('')
  const [expectedOutcome, setExpectedOutcome] = useState('')
  const [saving, setSaving] = useState(false)

  const canSave = title.trim().length > 0

  function toggleMentalState(s: MentalState) {
    setMentalState((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
    )
  }

  async function handleSave() {
    if (!canSave || saving) return
    setSaving(true)
    const input: DecisionCreateInput = {
      title: title.trim(),
      decidedAt: fromLocalDateTime(decidedAt),
      reviewAt: reviewAt ? fromLocalDate(reviewAt) : null,
      mentalState,
      situation: situation.trim(),
      problemStatement: problemStatement.trim(),
      variables: variables.trim(),
      complications: complications.trim(),
      alternatives: alternatives.trim(),
      rangeOfOutcomes: rangeOfOutcomes.trim(),
      expectedOutcome: expectedOutcome.trim()
    }
    await window.api.decisions.create(input)
    navigate('/decisions')
  }

  return (
    <div className="mx-auto max-w-[780px] pb-16">
      <button
        type="button"
        onClick={() => navigate('/decisions')}
        className="mb-6 flex items-center gap-1.5 text-[13px] text-text-muted hover:text-text"
      >
        <ArrowLeft size={14} strokeWidth={2} />
        Back
      </button>

      <h1 className="font-serif text-[34px] font-medium leading-tight tracking-tight text-text">
        New Decision
      </h1>
      <p className="mt-1 text-[13px] text-text-muted">
        Document your thinking now so you can learn from it later.
      </p>

      <div className="mt-8 flex flex-col gap-6">
        {/* Title */}
        <div>
          <label className="text-[12px] font-semibold uppercase tracking-wide text-text-muted">
            Decision title <span className="ml-0.5 text-text-muted/60">*</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="What are you deciding?"
            className="mt-1.5 w-full rounded-lg border border-border bg-bg-elevated px-4 py-3 text-[14px] text-text placeholder:text-text-muted/50 focus:border-text-muted focus:outline-none"
          />
        </div>

        {/* Dates */}
        <div className="flex gap-4">
          <div className="flex-1">
            <label className="text-[12px] font-semibold uppercase tracking-wide text-text-muted">
              Decided at
            </label>
            <input
              type="datetime-local"
              value={decidedAt}
              onChange={(e) => setDecidedAt(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-border bg-bg-elevated px-4 py-3 text-[14px] text-text focus:border-text-muted focus:outline-none"
            />
          </div>
          <div className="flex-1">
            <label className="text-[12px] font-semibold uppercase tracking-wide text-text-muted">
              Review on
            </label>
            <input
              type="date"
              value={reviewAt}
              onChange={(e) => setReviewAt(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-border bg-bg-elevated px-4 py-3 text-[14px] text-text focus:border-text-muted focus:outline-none"
            />
          </div>
        </div>

        {/* Mental state */}
        <div>
          <label className="text-[12px] font-semibold uppercase tracking-wide text-text-muted">
            Mental state
          </label>
          <p className="mt-0.5 text-[12px] text-text-muted">
            How are you feeling as you make this decision?
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {MENTAL_STATES.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => toggleMentalState(s)}
                className={[
                  'rounded-full border px-3 py-1 text-[12px] font-medium transition-colors',
                  mentalState.includes(s)
                    ? 'border-[rgb(var(--accent))] bg-[rgb(var(--accent))] text-accent-text dark:bg-nav-active dark:border-border dark:text-text'
                    : 'border-border bg-bg-elevated text-text-muted hover:text-text'
                ].join(' ')}
              >
                {MENTAL_STATE_LABELS[s]}
              </button>
            ))}
          </div>
        </div>

        <TextArea
          label="Situation"
          helper="What's going on? What are the circumstances?"
          value={situation}
          onChange={setSituation}
          placeholder="Describe the context around this decision"
        />

        <TextArea
          label="Problem statement"
          helper="What's the core question you need to answer?"
          value={problemStatement}
          onChange={setProblemStatement}
          placeholder="Frame the decision as a clear question"
        />

        <TextArea
          label="Key variables"
          helper="What factors matter most?"
          value={variables}
          onChange={setVariables}
          placeholder="List the variables that will influence the outcome"
        />

        <TextArea
          label="Complications"
          helper="What makes this decision hard?"
          value={complications}
          onChange={setComplications}
          placeholder="What constraints or risks complicate this?"
        />

        <TextArea
          label="Alternatives considered"
          helper="What other options did you weigh?"
          value={alternatives}
          onChange={setAlternatives}
          placeholder="What else could you do instead?"
        />

        <TextArea
          label="Range of outcomes"
          helper="Best case, worst case, and most likely."
          value={rangeOfOutcomes}
          onChange={setRangeOfOutcomes}
          placeholder="What's the spread of possible outcomes?"
        />

        <TextArea
          label="Expected outcome"
          helper="What do you think will happen? This will be hidden during review to protect against hindsight bias."
          value={expectedOutcome}
          onChange={setExpectedOutcome}
          placeholder="Your honest prediction"
          required
        />

        {/* Actions */}
        <div className="mt-4 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => navigate('/decisions')}
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
            {saving ? 'Saving…' : 'Save Decision'}
          </button>
        </div>
      </div>
    </div>
  )
}
