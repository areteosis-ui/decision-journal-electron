import { useCallback, useEffect, useRef, useState } from 'react'
import { Loader2, Sparkles, Trash2, X } from 'lucide-react'
import {
  LENS_DESCRIPTIONS,
  LENS_KINDS,
  LENS_LABELS,
  type LensEvent,
  type LensKind,
  type LensRecord
} from '@shared/ipc-contract'
import { useChatStore } from '../store/chat'

interface StreamState {
  requestId: string
  kind: LensKind
  partial: string
  error: string | null
}

export default function LensPanel({ decisionId }: { decisionId: string }) {
  const activeModel = useChatStore((s) => s.activeModel)
  const chatStage = useChatStore((s) => s.stage)
  const chatInit = useChatStore((s) => s.init)
  const chatInitialized = useChatStore((s) => s.initialized)

  const [lenses, setLenses] = useState<LensRecord[]>([])
  const [stream, setStream] = useState<StreamState | null>(null)
  const [loaded, setLoaded] = useState(false)
  const streamRef = useRef<StreamState | null>(null)

  useEffect(() => {
    streamRef.current = stream
  }, [stream])

  useEffect(() => {
    if (!chatInitialized) {
      void chatInit()
    }
  }, [chatInit, chatInitialized])

  useEffect(() => {
    let cancelled = false
    window.api.lenses.list(decisionId).then((rows) => {
      if (!cancelled) {
        setLenses(rows)
        setLoaded(true)
      }
    })
    return () => {
      cancelled = true
    }
  }, [decisionId])

  useEffect(() => {
    const unsub = window.api.lenses.onEvent((evt: LensEvent) => {
      const current = streamRef.current
      if (!current || current.requestId !== evt.requestId) return
      if (evt.type === 'token') {
        setStream((s) => (s ? { ...s, partial: s.partial + evt.token } : s))
      } else if (evt.type === 'done') {
        setLenses((prev) => [evt.lens, ...prev])
        setStream(null)
      } else if (evt.type === 'error') {
        setStream((s) => (s ? { ...s, error: evt.message } : s))
      } else if (evt.type === 'cancelled') {
        setStream(null)
      }
    })
    return unsub
  }, [])

  const runLens = useCallback(
    async (kind: LensKind) => {
      if (stream) return
      if (!activeModel) return
      const requestId = await window.api.lenses.run(decisionId, kind, activeModel)
      setStream({ requestId, kind, partial: '', error: null })
    },
    [activeModel, decisionId, stream]
  )

  const cancelStream = useCallback(async () => {
    if (!stream) return
    await window.api.lenses.cancel(stream.requestId)
    setStream(null)
  }, [stream])

  const deleteLens = useCallback(async (id: string) => {
    await window.api.lenses.delete(id)
    setLenses((prev) => prev.filter((l) => l.id !== id))
  }, [])

  const modelReady = chatStage === 'chat' && activeModel !== null
  const disabled = !modelReady || stream !== null

  return (
    <div className="rounded-2xl border border-border bg-bg-elevated p-6">
      <div className="flex items-start gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border bg-bg text-text">
          <Sparkles size={15} strokeWidth={1.75} />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-serif text-[18px] font-medium text-text">Analyze with a lens</h3>
          <p className="mt-0.5 text-[12.5px] leading-relaxed text-text-muted">
            Run this decision through a focused analytical frame. The response streams from your
            local Ollama model — nothing leaves your Mac.
          </p>
        </div>
      </div>

      {!modelReady && (
        <div className="mt-4 rounded-lg border border-dashed border-border bg-bg/60 px-3.5 py-2.5 text-[12px] leading-relaxed text-text-muted">
          {chatStage === 'not-installed'
            ? 'Ollama is not running. Open the Chat tab to install or start it, then come back.'
            : chatStage === 'setup'
              ? 'No Ollama model selected yet. Open the Chat tab and pick one, then come back.'
              : 'Loading Ollama state…'}
        </div>
      )}

      <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {LENS_KINDS.map((kind) => (
          <button
            key={kind}
            type="button"
            onClick={() => runLens(kind)}
            disabled={disabled}
            className="flex flex-col items-start gap-0.5 rounded-xl border border-border bg-bg px-3.5 py-3 text-left transition-colors hover:border-text/30 hover:bg-nav-active disabled:cursor-not-allowed disabled:opacity-50"
          >
            <span className="text-[13px] font-medium text-text">{LENS_LABELS[kind]}</span>
            <span className="text-[11.5px] leading-snug text-text-muted">
              {LENS_DESCRIPTIONS[kind]}
            </span>
          </button>
        ))}
      </div>

      {stream && (
        <div className="mt-5 rounded-xl border border-[rgb(var(--accent))]/40 bg-bg/60 px-4 py-3 dark:border-text/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-[12px] text-text-muted">
              <Loader2 size={13} className="animate-spin" />
              <span className="font-medium text-text">{LENS_LABELS[stream.kind]}</span>
              <span>— streaming…</span>
            </div>
            <button
              type="button"
              onClick={cancelStream}
              aria-label="Cancel lens run"
              className="flex h-6 w-6 items-center justify-center rounded-md text-text-muted hover:bg-nav-active hover:text-text"
            >
              <X size={13} strokeWidth={1.75} />
            </button>
          </div>
          {stream.error ? (
            <p className="mt-2 text-[12.5px] text-red-500/90">{stream.error}</p>
          ) : (
            <p className="mt-2 whitespace-pre-wrap text-[13px] leading-relaxed text-text">
              {stream.partial || ' '}
            </p>
          )}
        </div>
      )}

      {loaded && lenses.length > 0 && (
        <div className="mt-6">
          <h4 className="text-[11.5px] font-semibold uppercase tracking-wide text-text-muted">
            Past analyses
          </h4>
          <div className="mt-3 flex flex-col gap-3">
            {lenses.map((lens) => (
              <LensCard key={lens.id} lens={lens} onDelete={() => deleteLens(lens.id)} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function LensCard({ lens, onDelete }: { lens: LensRecord; onDelete: () => void }) {
  return (
    <article className="rounded-xl border border-border bg-bg px-4 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-[12.5px] font-medium text-text">{LENS_LABELS[lens.kind]}</span>
          <span className="text-[11px] text-text-muted">{formatTimestamp(lens.createdAt)}</span>
        </div>
        <button
          type="button"
          onClick={onDelete}
          aria-label="Delete analysis"
          className="flex h-6 w-6 items-center justify-center rounded-md text-text-muted hover:bg-nav-active hover:text-text"
        >
          <Trash2 size={12} strokeWidth={1.75} />
        </button>
      </div>
      <p className="mt-2 whitespace-pre-wrap text-[13px] leading-relaxed text-text">
        {lens.content}
      </p>
      <p className="mt-2 text-[10.5px] text-text-muted">via {lens.modelId}</p>
    </article>
  )
}

function formatTimestamp(ms: number): string {
  return new Date(ms).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  })
}
