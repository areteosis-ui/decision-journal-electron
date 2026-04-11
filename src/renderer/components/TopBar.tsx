import { Search, User, Lock } from 'lucide-react'
import ThemeToggle from './ThemeToggle'
import { useAuthStore } from '../store/auth'

export default function TopBar() {
  const lock = useAuthStore((s) => s.lock)

  return (
    <header className="drag-region flex h-[52px] shrink-0 items-center gap-4 border-b border-border bg-bg px-6">
      <div className="no-drag relative flex-1 max-w-[560px]">
        <Search
          size={16}
          className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted"
          strokeWidth={1.75}
        />
        <input
          type="text"
          placeholder="Search decisions..."
          className="h-9 w-full rounded-full border border-border bg-bg-elevated pl-10 pr-4 text-[13px] text-text placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-border"
        />
      </div>

      <div className="no-drag ml-auto flex items-center gap-2">
        <ThemeToggle />
        <button
          type="button"
          onClick={() => lock()}
          aria-label="Lock"
          title="Lock"
          className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-bg-elevated text-text-muted transition-colors hover:text-text"
        >
          <Lock size={15} strokeWidth={1.75} />
        </button>
        <button
          type="button"
          aria-label="Profile"
          className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-bg-elevated text-text-muted hover:text-text"
        >
          <User size={16} strokeWidth={1.75} />
        </button>
      </div>
    </header>
  )
}
