import type { ReactNode } from 'react'
import { Inbox } from 'lucide-react'

interface EmptyStateProps {
  title: string
  children?: ReactNode
  actions?: ReactNode
}

export function EmptyState({ title, children, actions }: EmptyStateProps) {
  return (
    <div className="mx-auto flex max-w-lg flex-col items-center gap-4 px-4 py-8 text-center">
      <Inbox size={28} className="text-fg-muted" aria-hidden="true" />
      <p className="text-fg-strong text-base font-semibold">{title}</p>
      {children && (
        <div className="text-fg text-sm break-words">{children}</div>
      )}
      {actions && (
        <div className="flex flex-wrap justify-center gap-2">{actions}</div>
      )}
    </div>
  )
}
