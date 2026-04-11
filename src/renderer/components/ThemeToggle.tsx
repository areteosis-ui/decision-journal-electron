import { Sun, Moon, Monitor } from 'lucide-react'
import type { ThemeMode } from '@shared/ipc-contract'
import { useThemeStore } from '../store/theme'

const OPTIONS: Array<{ mode: ThemeMode; label: string; Icon: typeof Sun }> = [
  { mode: 'light', label: 'Light', Icon: Sun },
  { mode: 'dark', label: 'Dark', Icon: Moon },
  { mode: 'system', label: 'System', Icon: Monitor }
]

export default function ThemeToggle() {
  const mode = useThemeStore((s) => s.mode)
  const setMode = useThemeStore((s) => s.setMode)

  return (
    <div className="flex h-9 items-center rounded-full border border-border bg-bg-elevated px-1">
      {OPTIONS.map(({ mode: m, label, Icon }) => {
        const active = mode === m
        return (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            aria-label={label}
            aria-pressed={active}
            className={[
              'flex h-7 w-8 items-center justify-center rounded-full transition-colors',
              active ? 'text-text' : 'text-text-muted hover:text-text'
            ].join(' ')}
          >
            <Icon size={14} strokeWidth={1.75} />
          </button>
        )
      })}
    </div>
  )
}
