import { contextBridge, ipcRenderer } from 'electron'
import type {
  Api,
  Decision,
  DecisionCreateInput,
  DecisionReviewInput,
  DecisionUpdateInput,
  ThemeMode,
  UnlockResult,
  VaultStatus
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
    unlockWithTouchId: () => ipcRenderer.invoke('vault:unlock-touchid')
  },
  decisions: {
    list: (): Promise<Decision[]> => ipcRenderer.invoke('decisions:list'),
    get: (id: string): Promise<Decision | null> => ipcRenderer.invoke('decisions:get', id),
    create: (input: DecisionCreateInput): Promise<Decision> =>
      ipcRenderer.invoke('decisions:create', input),
    update: (id: string, patch: DecisionUpdateInput): Promise<Decision> =>
      ipcRenderer.invoke('decisions:update', id, patch),
    delete: (id: string): Promise<void> => ipcRenderer.invoke('decisions:delete', id),
    review: (id: string, input: DecisionReviewInput): Promise<Decision> =>
      ipcRenderer.invoke('decisions:review', id, input),
    clearReview: (id: string): Promise<Decision> =>
      ipcRenderer.invoke('decisions:clear-review', id),
    listReviewable: (): Promise<Decision[]> => ipcRenderer.invoke('decisions:list-reviewable'),
    listUpcoming: (): Promise<Decision[]> => ipcRenderer.invoke('decisions:list-upcoming')
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
  }
}

contextBridge.exposeInMainWorld('api', api)
