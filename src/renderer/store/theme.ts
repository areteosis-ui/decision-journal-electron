import { create } from 'zustand'
import type { ThemeMode } from '@shared/ipc-contract'

interface ThemeState {
  mode: ThemeMode
  systemIsDark: boolean
  ready: boolean
  init: () => Promise<void>
  setMode: (mode: ThemeMode) => Promise<void>
  resolved: () => 'light' | 'dark'
}

function applyClass(isDark: boolean) {
  const root = document.documentElement
  if (isDark) {
    root.classList.add('dark')
  } else {
    root.classList.remove('dark')
  }
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  mode: 'system',
  systemIsDark: window.matchMedia('(prefers-color-scheme: dark)').matches,
  ready: false,

  init: async () => {
    const mode = await window.api.theme.get()
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const systemIsDark = mq.matches

    set({ mode, systemIsDark, ready: true })
    applyClass(mode === 'dark' || (mode === 'system' && systemIsDark))

    mq.addEventListener('change', (e) => {
      set({ systemIsDark: e.matches })
      if (get().mode === 'system') applyClass(e.matches)
    })

    window.api.theme.onSystemChange((isDark) => {
      set({ systemIsDark: isDark })
      if (get().mode === 'system') applyClass(isDark)
    })
  },

  setMode: async (mode) => {
    set({ mode })
    await window.api.theme.set(mode)
    const isDark = mode === 'dark' || (mode === 'system' && get().systemIsDark)
    applyClass(isDark)
  },

  resolved: () => {
    const { mode, systemIsDark } = get()
    return mode === 'dark' || (mode === 'system' && systemIsDark) ? 'dark' : 'light'
  }
}))
