import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useMotion } from '@/components/ui/motion'
import { Link, useLocation } from 'react-router-dom'
import { ChevronDown, LogOut } from 'lucide-react'
import { useTranslation } from 'react-i18next'

interface AccountLink {
  label: string
  to: string
  icon?: ReactNode
  active?: boolean
}
interface AppAccountMenuProps {
  name: string
  email?: string
  note?: string
  links?: AccountLink[]
  onSignOut?: () => void
}

export function AppAccountMenu({
  name,
  email,
  note,
  links = [],
  onSignOut,
}: AppAccountMenuProps) {
  const { t } = useTranslation('common')
  const account = useRef<HTMLDetailsElement>(null)
  const [open, setOpen] = useState(false)
  const popover = useMotion({ preset: 'popover', disabled: !open, replayKey: open ? 1 : 0 })
  const location = useLocation()
  const close = () => {
    if (account.current) account.current.open = false
  }
  useEffect(() => {
    const dismiss = (event: PointerEvent) => {
      if (
        event.target instanceof Node &&
        !account.current?.contains(event.target)
      )
        close()
    }
    document.addEventListener('pointerdown', dismiss)
    return () => document.removeEventListener('pointerdown', dismiss)
  }, [])
  useEffect(() => {
    close()
  }, [location.pathname, location.search])
  const initials = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
  return (
    <details
      ref={account}
      onToggle={(event) => setOpen(event.currentTarget.open)}
      className="group relative"
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          close()
          account.current?.querySelector('summary')?.focus()
        }
      }}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node)) close()
      }}
    >
      <summary
        aria-label={t('account.menu', { name })}
        className={`text-text-strong hover:bg-surface-muted flex min-h-11 cursor-pointer list-none items-center gap-2.5 rounded-lg px-2 py-1 text-[13px] transition-colors [&::-webkit-details-marker]:hidden`}
      >
        <span
          aria-hidden="true"
          className="flex size-[34px] shrink-0 items-center justify-center rounded-full bg-orange-200 text-xs font-bold text-orange-900 shadow-sm"
        >
          {initials || 'U'}
        </span>
        <span className="hidden max-w-40 truncate font-semibold sm:block">
          {name}
        </span>
        <ChevronDown
          size={15}
          aria-hidden="true"
          className={`text-text-muted shrink-0 transition-transform group-open:rotate-180 motion-reduce:transition-none`}
        />
      </summary>
      <div
        ref={popover}
        className={`bg-surface text-text-strong ring-border absolute top-full right-0 z-50 mt-3 w-[min(304px,calc(100vw-32px))] rounded-xl p-2 shadow-[0_16px_48px_-12px_rgba(0,0,0,0.35)] ring-1`}
      >
        <div className="flex flex-col gap-1 px-3 pt-3 pb-4">
          <strong className="text-sm font-semibold [overflow-wrap:anywhere]">
            {name}
          </strong>
          {email && (
            <span
              className={`text-text-muted text-[13px] [overflow-wrap:anywhere]`}
            >
              {email}
            </span>
          )}
          {note && (
            <span
              className={`bg-surface-muted text-text mt-2 self-start rounded-md px-2 py-1 text-[11px] font-medium`}
            >
              {note}
            </span>
          )}
        </div>
        {links.length > 0 && (
          <nav
            aria-label={t('account.navigation')}
            className={`border-border border-t pt-2`}
          >
            {links.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                onClick={close}
                aria-current={link.active ? 'page' : undefined}
                className={`flex min-h-11 items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold ${link.active ? 'bg-accent-soft !text-accent-text' : '!text-text-strong hover:bg-surface-muted'}`}
              >
                <span aria-hidden="true">{link.icon}</span>
                {link.label}
              </Link>
            ))}
          </nav>
        )}
        {onSignOut && (
          <div className={`border-border mt-2 border-t pt-2`}>
            <button
              type="button"
              onClick={() => {
                close()
                onSignOut()
              }}
              className={`text-danger hover:bg-danger-soft flex min-h-11 w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-semibold`}
            >
              <LogOut size={17} aria-hidden="true" />
              {t('actions.signOut')}
            </button>
          </div>
        )}
      </div>
    </details>
  )
}
