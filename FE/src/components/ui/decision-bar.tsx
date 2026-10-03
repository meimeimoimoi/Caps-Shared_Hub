import type { ReactNode } from 'react'
import { Clock, TriangleAlert } from 'lucide-react'
import { cn } from '@/lib/utils'

/* SHFT §9 · Thanh quyết định (màn công cụ) */
export interface DecisionBarProps {
  blockers: { text: string; tone?: 'neutral' | 'warning' }[] // lý do primary bị khóa
  secondary?: ReactNode
  danger?: ReactNode
  primary: { label: string; onClick: () => void; disabled?: boolean }
  className?: string
}

export function DecisionBar({ blockers, secondary, danger, primary, className }: DecisionBarProps) {
  return (
    <div className={cn('decision-bar flex-wrap max-md:px-4', className)}>
      <ul className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
        {blockers.map(({ text, tone = 'neutral' }) => (
          <li
            key={text}
            className={cn(
              'inline-flex items-center gap-1.5',
              tone === 'warning' ? 'text-warning' : 'text-fg-muted',
            )}
          >
            {tone === 'warning' ? (
              <TriangleAlert size={14} aria-hidden="true" />
            ) : (
              <Clock size={14} aria-hidden="true" />
            )}
            {text}
          </li>
        ))}
      </ul>
      <div className="ml-auto flex gap-2">
        {secondary}
        {danger}
        <button
          type="button"
          disabled={primary.disabled}
          onClick={primary.onClick}
          className="btn btn-press btn-primary"
        >
          {primary.label}
        </button>
      </div>
    </div>
  )
}
