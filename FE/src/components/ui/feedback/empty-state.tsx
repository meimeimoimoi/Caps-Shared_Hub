import type { ReactNode } from 'react'
import { CircleAlert, Inbox } from 'lucide-react'
import { cn } from '@/lib/utils'

interface EmptyStateProps {
  title: string
  children?: ReactNode
  actions?: ReactNode
  /** 'error' marks a failed load: alert icon, danger colour and role="alert". */
  tone?: 'empty' | 'error'
  /** Replaces the default icon of the tone; render it with aria-hidden. */
  icon?: ReactNode
}

export function EmptyState({
  title,
  children,
  actions,
  tone = 'empty',
  icon,
}: EmptyStateProps) {
  const isError = tone === 'error'
  return (
    <div
      role={isError ? 'alert' : undefined}
      className="mx-auto flex max-w-lg flex-col items-center gap-4 px-4 py-8 text-center"
    >
      {icon ??
        (isError ? (
          <CircleAlert size={28} className="text-danger" aria-hidden="true" />
        ) : (
          <Inbox size={28} className="text-fg-muted" aria-hidden="true" />
        ))}
      <p
        className={cn(
          'text-base font-semibold',
          isError ? 'text-danger' : 'text-fg-strong'
        )}
      >
        {title}
      </p>
      {children && (
        <div className="text-fg text-sm break-words">{children}</div>
      )}
      {actions && (
        <div className="flex flex-wrap justify-center gap-2">{actions}</div>
      )}
    </div>
  )
}
