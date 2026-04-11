export type ThemeMode = 'light' | 'dark' | 'system'

export interface VaultStatus {
  initialized: boolean
  cooldownUntil: number | null
  failedAttempts: number
  touchIdEnabled: boolean
  touchIdAvailable: boolean
}

export interface UnlockResult {
  ok: boolean
  error?: 'wrong-pin' | 'cooldown' | 'invalid-format' | 'internal'
  cooldownUntil?: number
  failedAttempts?: number
}

export interface Decision {
  id: string
  title: string
  body: string
  createdAt: number
  reviewAt: number | null
  isSample: 0 | 1
}

export interface Api {
  vault: {
    status(): Promise<VaultStatus>
    create(pin: string): Promise<UnlockResult>
    unlock(pin: string): Promise<UnlockResult>
    lock(): Promise<void>
    changePin(currentPin: string, newPin: string): Promise<UnlockResult>
    setTouchIdEnabled(enabled: boolean, pin: string): Promise<{ ok: boolean; error?: string }>
    enableTouchIdCurrentSession(): Promise<{ ok: boolean; error?: string }>
    unlockWithTouchId(): Promise<UnlockResult>
  }
  decisions: {
    list(): Promise<Decision[]>
  }
  theme: {
    get(): Promise<ThemeMode>
    set(mode: ThemeMode): Promise<void>
    onSystemChange(cb: (isDark: boolean) => void): () => void
  }
  app: {
    version(): Promise<string>
    platform(): Promise<string>
  }
}

declare global {
  interface Window {
    api: Api
  }
}
