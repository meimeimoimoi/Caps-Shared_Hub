import { useEffect, useId, useRef, type ReactNode } from 'react'
import { CircleHelp } from 'lucide-react'

export interface HelpTipProps {
  label: string
  children: ReactNode
  className?: string
}

/**
 * A disclosure: works with keyboard, touch and without hover. Closes on Escape or a click outside,
 * and opens from the icon towards the right so it can sit right after a label.
 */
export function HelpTip({ label, children, className = '' }: HelpTipProps) {
  const id = useId()
  const ref = useRef<HTMLDetailsElement>(null)

  useEffect(() => {
    const details = ref.current
    if (!details) return
    const close = (e: Event) => {
      if (!details.open) return
      if (e instanceof KeyboardEvent) {
        if (e.key !== 'Escape') return
        details.open = false
        details.querySelector('summary')?.focus()
        return
      }
      if (!details.contains(e.target as Node)) details.open = false
    }
    document.addEventListener('pointerdown', close)
    document.addEventListener('keydown', close)
    return () => {
      document.removeEventListener('pointerdown', close)
      document.removeEventListener('keydown', close)
    }
  }, [])

  return (
    <details ref={ref} className={`group relative shrink-0 ${className}`}>
      <summary
        aria-label={label}
        aria-controls={id}
        className="!text-ex-muted hover:!text-ex-accent group-open:!text-ex-accent !flex min-h-6 min-w-6 cursor-pointer items-center justify-center rounded-full !p-0 !no-underline transition-colors marker:hidden [&::-webkit-details-marker]:hidden"
      >
        <CircleHelp size={16} aria-hidden="true" />
      </summary>
      <div
        id={id}
        className="border-ex-input-border text-ex-ink bg-surface shadow-overlay absolute top-full left-0 z-30 mt-2 w-64 max-w-[calc(100vw-3rem)] rounded-lg border p-3 text-[13px] leading-relaxed font-normal"
      >
        {children}
      </div>
    </details>
  )
}
