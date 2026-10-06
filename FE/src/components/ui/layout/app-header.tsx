import type { ButtonHTMLAttributes, ReactNode, Ref } from 'react'
import { Menu } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTranslation } from 'react-i18next'

interface AppHeaderProps {
  context: ReactNode
  actions?: ReactNode
  actionsClassName?: string
  onOpenNavigation?: () => void
  navigationButtonRef?: Ref<HTMLButtonElement>
  navigationButtonClassName?: string
  className?: string
}

/** Workspace chrome. Account data, theme controls and navigation remain in the caller. */
export function AppHeader({
  context,
  actions,
  actionsClassName,
  onOpenNavigation,
  navigationButtonRef,
  navigationButtonClassName = 'md:hidden',
  className,
}: AppHeaderProps) {
  const { t } = useTranslation('common')
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
            aria-label={t('navigation.open')}
            aria-haspopup="dialog"
            onClick={onOpenNavigation}
            className={cn(
              'motion-interactive rounded-control flex size-11 shrink-0 items-center justify-center',
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
        <div
          className={cn(
            'flex min-w-0 items-center gap-3 sm:gap-4',
            actionsClassName
          )}
        >
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
        'motion-interactive rounded-control flex size-11 shrink-0 items-center justify-center text-xs font-bold tracking-wider',
        'text-text-muted hover:bg-surface-muted hover:text-text-strong',
        className
      )}
    />
  )
}
