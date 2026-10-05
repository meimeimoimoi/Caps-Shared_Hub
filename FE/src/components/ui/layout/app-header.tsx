import type { ButtonHTMLAttributes, ReactNode, Ref } from 'react'
import { Menu } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AppHeaderProps {
  context: ReactNode
  actions?: ReactNode
  onOpenNavigation?: () => void
  navigationButtonRef?: Ref<HTMLButtonElement>
  navigationButtonClassName?: string
  className?: string
}

/** Workspace chrome. Account data, theme controls and navigation remain in the caller. */
export function AppHeader({
  context,
  actions,
  onOpenNavigation,
  navigationButtonRef,
  navigationButtonClassName = 'md:hidden',
  className,
}: AppHeaderProps) {
  return (
    <header
      className={cn(
        'font-num sticky top-0 z-20 flex min-h-18 flex-wrap items-center justify-between gap-4 border-b px-5 py-3 md:px-8',
        'border-hairline bg-header text-text-strong',
        className
      )}
    >
      <div
        className={`text-text-muted flex min-w-0 items-center gap-3 text-sm`}
      >
        {onOpenNavigation && (
          <button
            ref={navigationButtonRef}
            type="button"
            aria-label="Open navigation"
            aria-haspopup="dialog"
            onClick={onOpenNavigation}
            className={cn(
              'rounded-control flex size-11 shrink-0 items-center justify-center',
              'hover:bg-surface-muted',
              navigationButtonClassName
            )}
          >
            <Menu size={20} aria-hidden="true" />
          </button>
        )}
        {context}
      </div>
      {actions && (
        <div className="flex min-w-0 items-center gap-3 sm:gap-4">
          {actions}
        </div>
      )}
    </header>
  )
}

export function HeaderActionButton({
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      {...props}
      className={cn(
        'rounded-control flex size-11 shrink-0 items-center justify-center text-xs font-bold tracking-wider transition-colors',
        'text-text-muted hover:bg-surface-muted hover:text-text-strong',
        className
      )}
    />
  )
}
