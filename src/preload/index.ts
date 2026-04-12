import { contextBridge, ipcRenderer } from 'electron'
import type {
  Api,
  Decision,
  DecisionCreateInput,
  DecisionUpdateInput,
  ThemeMode,
  UnlockResult,
  VaultStatus,
  WhisperDownloadProgress,
  WhisperModelInfo,
  WhisperStatus
} from '@shared/ipc-contract'

const api: Api = {
  vault: {
    status: (): Promise<VaultStatus> => ipcRenderer.invoke('vault:status'),
    create: (pin: string): Promise<UnlockResult> => ipcRenderer.invoke('vault:create', pin),
    unlock: (pin: string): Promise<UnlockResult> => ipcRenderer.invoke('vault:unlock', pin),
    lock: (): Promise<void> => ipcRenderer.invoke('vault:lock'),
    changePin: (currentPin, newPin) =>
      ipcRenderer.invoke('vault:change-pin', currentPin, newPin),
    setTouchIdEnabled: (enabled, pin) =>
      ipcRenderer.invoke('vault:set-touchid', enabled, pin),
    enableTouchIdCurrentSession: () =>
      ipcRenderer.invoke('vault:enable-touchid-current-session'),
    unlockWithTouchId: () => ipcRenderer.invoke('vault:unlock-touchid'),
    verifyPin: (pin: string) => ipcRenderer.invoke('vault:verify-pin', pin),
    promptTouchIdForAction: (reason: string) =>
      ipcRenderer.invoke('vault:prompt-touchid-action', reason)
  },
  decisions: {
    list: (): Promise<Decision[]> => ipcRenderer.invoke('decisions:list'),
    get: (id: string): Promise<Decision | null> => ipcRenderer.invoke('decisions:get', id),
    create: (input: DecisionCreateInput): Promise<Decision> =>
      ipcRenderer.invoke('decisions:create', input),
    update: (id: string, patch: DecisionUpdateInput): Promise<Decision> =>
      ipcRenderer.invoke('decisions:update', id, patch),
    delete: (id: string): Promise<void> => ipcRenderer.invoke('decisions:delete', id)
  },
  theme: {
    get: (): Promise<ThemeMode> => ipcRenderer.invoke('theme:get'),
    set: (mode: ThemeMode): Promise<void> => ipcRenderer.invoke('theme:set', mode),
    onSystemChange: (cb) => {
      const listener = (_: unknown, isDark: boolean) => cb(isDark)
      ipcRenderer.on('theme:system-changed', listener)
      return () => ipcRenderer.removeListener('theme:system-changed', listener)
    }
  },
  app: {
    version: (): Promise<string> => ipcRenderer.invoke('app:version'),
    platform: (): Promise<string> => ipcRenderer.invoke('app:platform')
  },
  transcription: {
    getStatus: (): Promise<WhisperStatus> => ipcRenderer.invoke('transcription:status'),
    listAvailableModels: (): Promise<WhisperModelInfo[]> =>
      ipcRenderer.invoke('transcription:available-models'),
    downloadModel: (name: string): Promise<void> =>
      ipcRenderer.invoke('transcription:download', name),
    cancelDownload: (): Promise<void> => ipcRenderer.invoke('transcription:cancel-download'),
    setActiveModel: (name: string): Promise<void> =>
      ipcRenderer.invoke('transcription:set-active', name),
    deleteModel: (name: string): Promise<void> =>
      ipcRenderer.invoke('transcription:delete', name),
    transcribe: (samples: ArrayBuffer): Promise<string> =>
      ipcRenderer.invoke('transcription:transcribe', samples),
    onDownloadProgress: (cb: (progress: WhisperDownloadProgress) => void) => {
      const listener = (_: unknown, progress: WhisperDownloadProgress) => cb(progress)
      ipcRenderer.on('whisper:download-progress', listener)
      return () => ipcRenderer.removeListener('whisper:download-progress', listener)
    }
  }
}

contextBridge.exposeInMainWorld('api', api)
