import { useCallback, useEffect, useRef, useState } from 'react'
import { Mic } from 'lucide-react'
import { useTranscriptionStore } from '../../store/transcription'
import WhisperSetupModal from './WhisperSetupModal'
import RecorderPopover from './RecorderPopover'

export default function MicButton({
  onInsert
}: {
  onInsert: (text: string) => void
}) {
  const { activeModel, loading, setupModalOpen, openSetupModal, refresh } =
    useTranscriptionStore()
  const [recorderOpen, setRecorderOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const initialized = useRef(false)

  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true
      refresh()
    }
  }, [refresh])

  const handleClick = useCallback(() => {
    if (loading) return
    if (!activeModel) {
      openSetupModal()
    } else {
      setRecorderOpen(true)
    }
  }, [activeModel, loading, openSetupModal])

  const handleSetupReady = useCallback(() => {
    setRecorderOpen(true)
  }, [])

  const handleTranscribed = useCallback(
    (text: string) => {
      if (text.trim()) onInsert(text)
    },
    [onInsert]
  )

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={handleClick}
        aria-label="Voice input"
        title="Voice input"
        className="flex h-7 w-7 items-center justify-center rounded-full text-text-muted/50 transition-colors hover:text-text-muted hover:bg-text/5"
      >
        <Mic size={14} strokeWidth={1.75} />
      </button>

      {recorderOpen && (
        <RecorderPopover
          onTranscribed={handleTranscribed}
          onClose={() => setRecorderOpen(false)}
        />
      )}

      {setupModalOpen && <WhisperSetupModal onReady={handleSetupReady} />}
    </div>
  )
}
