import { useEffect, useRef, useState } from 'react'

interface PinPadProps {
  value: string
  onChange: (v: string) => void
  onSubmit?: () => void
  autoFocus?: boolean
  disabled?: boolean
}

const LEN = 6

export default function PinPad({
  value,
  onChange,
  onSubmit,
  autoFocus = true,
  disabled
}: PinPadProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [focused, setFocused] = useState(false)

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus()
  }, [autoFocus])

  useEffect(() => {
    if (value.length === LEN && onSubmit) onSubmit()
  }, [value, onSubmit])

  const activeIndex = Math.min(value.length, LEN - 1)

  return (
    <div
      className="relative flex cursor-text items-center justify-center gap-3"
      onMouseDown={(e) => {
        e.preventDefault()
        inputRef.current?.focus()
      }}
    >
      <input
        ref={inputRef}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        pattern="\d*"
        maxLength={LEN}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, LEN))}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        className="absolute inset-0 h-full w-full cursor-text opacity-0"
        aria-label="6-digit PIN"
      />
      {Array.from({ length: LEN }).map((_, i) => {
        const filled = i < value.length
        const isActive = focused && !disabled && i === activeIndex
        return (
          <div
            key={i}
            className={[
              'flex h-12 w-10 items-center justify-center rounded-lg border transition-all',
              filled
                ? 'border-text/40 bg-bg-elevated'
                : 'border-border bg-bg-elevated/60',
              isActive
                ? 'border-text/70 ring-2 ring-text/20 ring-offset-2 ring-offset-bg'
                : ''
            ].join(' ')}
          >
            {filled ? (
              <span className="h-2.5 w-2.5 rounded-full bg-text" aria-hidden />
            ) : isActive ? (
              <span className="h-5 w-[2px] animate-pulse bg-text" aria-hidden />
            ) : null}
          </div>
        )
      })}
    </div>
  )
}
