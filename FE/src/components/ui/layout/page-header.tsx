import type { ReactNode } from 'react'
import { HelpTip } from '@/components/ui/feedback/help-tip'

interface PageHeaderProps {
  title: ReactNode
  /** Explanation of the page; shown in a HelpTip next to the title, never as a grey subtitle */
  help?: ReactNode
  helpLabel?: string
  /** Page-level actions aligned to the right of the title */
  actions?: ReactNode
  className?: string
}

/** One header for every tool page: title, optional HelpTip and actions */
export function PageHeader({
  title,
  help,
  helpLabel,
  actions,
  className = '',
}: PageHeaderProps) {
  return (
    <header
      className={`flex flex-wrap items-center justify-between gap-x-6 gap-y-3 ${className}`}
    >
      <div className="flex min-w-0 items-center gap-2">
        <h1 className="text-h1">{title}</h1>
        {help && (
          <HelpTip
            label={helpLabel ?? (typeof title === 'string' ? title : '')}
          >
            {help}
          </HelpTip>
        )}
      </div>
      {actions && (
        <div className="flex flex-wrap items-center gap-2">{actions}</div>
      )}
    </header>
  )
}
