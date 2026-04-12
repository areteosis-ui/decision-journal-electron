import { useCallback, useEffect, useState } from 'react'
import { Download, X, AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react'
import type { WhisperModelInfo } from '@shared/ipc-contract'
import { useTranscriptionStore } from '../../store/transcription'

type Phase = 'choose' | 'downloading' | 'success' | 'error'

export default function WhisperSetupModal({ onReady }: { onReady: () => void }) {
  const {
    availableModels,
    totalMemGB,
    downloadProgress,
    setDownloadProgress,
    closeSetupModal,
    refresh
  } = useTranscriptionStore()

  const [selected, setSelected] = useState<string>('base.en')
  const [phase, setPhase] = useState<Phase>('choose')
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    const unsub = window.api.transcription.onDownloadProgress((p) => {
      setDownloadProgress(p)
    })
    return unsub
  }, [setDownloadProgress])

  const handleDownload = useCallback(async () => {
    setPhase('downloading')
    setErrorMsg('')
    try {
      await window.api.transcription.downloadModel(selected)
      await refresh()
      setPhase('success')
      setTimeout(() => {
        closeSetupModal()
        onReady()
      }, 800)
    } catch (err) {
      setPhase('error')
      setErrorMsg(err instanceof Error ? err.message : 'Download failed')
      setDownloadProgress(null)
    }
  }, [selected, refresh, closeSetupModal, onReady, setDownloadProgress])

  const handleCancel = useCallback(async () => {
    if (phase === 'downloading') {
      await window.api.transcription.cancelDownload()
    }
    setDownloadProgress(null)
    closeSetupModal()
  }, [phase, closeSetupModal, setDownloadProgress])

  const pct =
    downloadProgress && downloadProgress.total > 0
      ? Math.round((downloadProgress.loaded / downloadProgress.total) * 100)
      : 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
      <div className="w-[440px] rounded-2xl border border-border bg-bg-elevated p-6 shadow-xl">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-serif text-[20px] font-medium text-text">
              Set up voice transcription
            </h3>
            <p className="mt-1 text-[12.5px] text-text-muted">
              Download a local speech-to-text model. Audio never leaves your device.
            </p>
          </div>
          <button
            type="button"
            onClick={handleCancel}
            className="flex h-7 w-7 items-center justify-center rounded-full text-text-muted hover:text-text"
          >
            <X size={15} />
          </button>
        </div>

        {phase === 'choose' && (
          <div className="mt-5 flex flex-col gap-2.5">
            {availableModels.map((m) => (
              <ModelCard
                key={m.name}
                model={m}
                selected={selected === m.name}
                onSelect={() => setSelected(m.name)}
                lowRamWarning={m.name === 'small.en' && totalMemGB < 8}
              />
            ))}

            <button
              type="button"
              onClick={handleDownload}
              className="mt-3 flex items-center justify-center gap-2 rounded-lg border border-[rgb(var(--accent))] bg-[rgb(var(--accent))] px-5 py-2.5 text-[13px] font-medium text-accent-text transition-colors hover:opacity-90 dark:bg-transparent dark:border-border dark:text-text"
            >
              <Download size={15} />
              Download {availableModels.find((m) => m.name === selected)?.label ?? selected}
            </button>
          </div>
        )}

        {phase === 'downloading' && (
          <div className="mt-6">
            <div className="flex items-center gap-2.5 text-[13px] text-text">
              <Loader2 size={15} className="animate-spin" />
              Downloading{' '}
              {availableModels.find((m) => m.name === selected)?.label ?? selected}... {pct}%
            </div>
            <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-border">
              <div
                className="h-full rounded-full bg-[rgb(var(--accent))] transition-all duration-200 dark:bg-text"
                style={{ width: `${pct}%` }}
              />
            </div>
            <button
              type="button"
              onClick={handleCancel}
              className="mt-4 text-[12.5px] text-text-muted hover:text-text"
            >
              Cancel download
            </button>
          </div>
        )}

        {phase === 'success' && (
          <div className="mt-6 flex items-center gap-2 text-[13px] text-green-600 dark:text-green-400">
            <CheckCircle2 size={16} />
            Model ready. Starting recorder...
          </div>
        )}

        {phase === 'error' && (
          <div className="mt-5">
            <div className="flex items-center gap-2 text-[13px] text-red-500">
              <AlertTriangle size={15} />
              {errorMsg}
            </div>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setPhase('choose')}
                className="rounded-md px-3 py-1.5 text-[12.5px] text-text-muted hover:text-text"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleDownload}
                className="rounded-md border border-[rgb(var(--accent))] bg-[rgb(var(--accent))] px-3 py-1.5 text-[12.5px] text-accent-text hover:opacity-90 dark:bg-transparent dark:border-border dark:text-text"
              >
                Retry
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function ModelCard({
  model,
  selected,
  onSelect,
  lowRamWarning
}: {
  model: WhisperModelInfo
  selected: boolean
  onSelect: () => void
  lowRamWarning: boolean
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={[
        'flex flex-col gap-0.5 rounded-xl border px-4 py-3 text-left transition-colors',
        selected
          ? 'border-[rgb(var(--accent))] bg-[rgb(var(--accent))]/5 dark:border-text dark:bg-text/5'
          : 'border-border bg-bg hover:border-text/30'
      ].join(' ')}
    >
      <div className="flex items-center justify-between">
        <span className="text-[13px] font-medium text-text">{model.label}</span>
        <span className="text-[12px] text-text-muted">{model.sizeLabel}</span>
      </div>
      <span className="text-[12px] text-text-muted">{model.description}</span>
      {lowRamWarning && (
        <span className="mt-1 flex items-center gap-1 text-[11.5px] text-amber-500">
          <AlertTriangle size={12} />
          Your Mac has less than 8 GB RAM — this model may run slowly.
        </span>
      )}
    </button>
  )
}
