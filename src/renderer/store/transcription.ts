import { create } from 'zustand'
import type { WhisperModelInfo, WhisperDownloadProgress } from '@shared/ipc-contract'

interface TranscriptionState {
  activeModel: string | null
  installedModels: string[]
  totalMemGB: number
  availableModels: WhisperModelInfo[]
  downloadProgress: WhisperDownloadProgress | null
  setupModalOpen: boolean
  loading: boolean

  refresh: () => Promise<void>
  openSetupModal: () => void
  closeSetupModal: () => void
  setDownloadProgress: (p: WhisperDownloadProgress | null) => void
}

export const useTranscriptionStore = create<TranscriptionState>((set) => ({
  activeModel: null,
  installedModels: [],
  totalMemGB: 0,
  availableModels: [],
  downloadProgress: null,
  setupModalOpen: false,
  loading: true,

  refresh: async () => {
    const [status, models] = await Promise.all([
      window.api.transcription.getStatus(),
      window.api.transcription.listAvailableModels()
    ])
    set({
      activeModel: status.activeModel,
      installedModels: status.installedModels,
      totalMemGB: status.totalMemGB,
      availableModels: models,
      loading: false
    })
  },

  openSetupModal: () => set({ setupModalOpen: true }),
  closeSetupModal: () => set({ setupModalOpen: false }),
  setDownloadProgress: (p) => set({ downloadProgress: p })
}))
