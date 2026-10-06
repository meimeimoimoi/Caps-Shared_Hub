import { useId, type ReactNode } from 'react'
import { CircleHelp } from 'lucide-react'

export interface HelpTipProps {
  label: string
  children: ReactNode
  className?: string
}

/** A disclosure: works with keyboard, touch and without hover. */
export function HelpTip({ label, children, className = '' }: HelpTipProps) {
  const id = useId()
  return (
    <details className={`text-ex-muted relative shrink-0 ${className}`}>
      <summary
        aria-label={label}
        aria-controls={id}
        className="!flex min-h-6 min-w-6 cursor-pointer items-center justify-center !p-0 !no-underline marker:hidden [&::-webkit-details-marker]:hidden"
      >
        <CircleHelp size={16} aria-hidden="true" />
      </summary>
      <div
        id={id}
        className="border-ex-input-border text-ex-ink absolute right-0 z-30 mt-2 w-64 max-w-[calc(100vw-3rem)] rounded-lg border bg-surface p-3 text-sm shadow-overlay"
      >
        {children}
      </div>
    </details>
  )
}
