import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { ChevronDown, LogOut, Moon, Sun } from 'lucide-react'
import { LanguageSwitcher } from './language-switcher'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'

const menuRow =
  'flex min-h-11 w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors hover:bg-surface-muted'

interface AccountLink {
  label: string
  to: string
  icon?: ReactNode
  active?: boolean
}
interface AppAccountMenuProps {
  name: string
  links?: AccountLink[]
  onSignOut?: () => void
  signOutLabel?: string
  isDark?: boolean
  onToggleTheme?: () => void
}

export function AppAccountMenu({
  name,
  links = [],
  onSignOut,
  signOutLabel,
  isDark,
  onToggleTheme,
}: AppAccountMenuProps) {
  const { t } = useTranslation('common')
  const account = useRef<HTMLDivElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const panelId = useId()
  const location = useLocation()
  const routeKey = location.key
  const [openRoute, setOpenRoute] = useState<string | null>(null)
  const open = openRoute === routeKey
  const close = () => {
    setOpenRoute(null)
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
  const initials = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
  return (
    <div
      ref={account}
      className="relative"
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          close()
          trigger.current?.focus()
        }
      }}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node)) close()
      }}
    >
      <button
        ref={trigger}
        type="button"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        onClick={() =>
          setOpenRoute((current) => (current === routeKey ? null : routeKey))
        }
        aria-label={t('account.menu', { name })}
        className={`text-text-strong hover:bg-surface-muted flex min-h-11 cursor-pointer list-none items-center gap-2.5 rounded-lg px-2 py-1 text-[13px] transition-colors [&::-webkit-details-marker]:hidden`}
      >
        <span
          aria-hidden="true"
          className="bg-accent-soft text-accent-text flex size-[34px] shrink-0 items-center justify-center rounded-full text-xs font-semibold"
        >
          {initials || 'U'}
        </span>
        <span className="hidden max-w-40 truncate font-semibold sm:block">
          {name}
        </span>
        <ChevronDown
          size={15}
          aria-hidden="true"
          className={cn(
            'text-text-muted shrink-0 transition-transform motion-reduce:transition-none',
            open && 'rotate-180'
          )}
        />
      </button>
      {open && (
        <div
          id={panelId}
          className="bg-surface text-text-strong shadow-overlay absolute top-full right-0 z-50 mt-2 max-h-[calc(100dvh-96px)] min-h-56 w-[min(320px,calc(100vw-24px))] overflow-y-auto rounded-xl p-1.5 font-sans tracking-normal [word-spacing:normal]"
        >
          {links.length > 0 && (
            <nav aria-label={t('account.navigation')} className="space-y-0.5">
              {links.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={close}
                  aria-current={link.active ? 'page' : undefined}
                  className={cn(
                    menuRow,
                    '!text-text-strong',
                    link.active && 'bg-surface-muted'
                  )}
                >
                  <span
                    aria-hidden="true"
                    className="text-text-muted flex size-5 shrink-0 items-center justify-center"
                  >
                    {link.icon}
                  </span>
                  <span className="flex-1">{link.label}</span>
                  {link.active && (
                    <span
                      aria-hidden="true"
                      className="bg-accent-text size-1.5 rounded-full"
                    />
                  )}
                </Link>
              ))}
            </nav>
          )}
          {onToggleTheme && (
            <div className="space-y-0.5">
              <LanguageSwitcher variant="account" />
              <button
                type="button"
                onClick={onToggleTheme}
                role="switch"
                aria-checked={Boolean(isDark)}
                aria-label={t('theme.darkMode')}
                className={menuRow}
              >
                {isDark ? (
                  <Moon
                    size={18}
                    aria-hidden="true"
                    className="text-text-muted shrink-0"
                  />
                ) : (
                  <Sun
                    size={18}
                    aria-hidden="true"
                    className="text-text-muted shrink-0"
                  />
                )}
                <span className="flex-1">{t('theme.appearance')}</span>
                <span aria-hidden="true" className="text-text-muted text-xs">
                  {t(isDark ? 'theme.darkLabel' : 'theme.lightLabel')}
                </span>
                <span
                  aria-hidden="true"
                  className={cn(
                    'flex h-5 w-9 shrink-0 items-center rounded-full p-0.5 transition-colors motion-reduce:transition-none',
                    isDark ? 'bg-switch-on' : 'bg-switch-off'
                  )}
                >
                  <span
                    className={cn(
                      'bg-switch-thumb size-4 rounded-full shadow-sm transition-transform motion-reduce:transition-none',
                      isDark && 'translate-x-4'
                    )}
                  />
                </span>
              </button>
            </div>
          )}
          {onSignOut && (
            <div className="border-border mt-1.5 border-t pt-1.5">
              <button
                type="button"
                onClick={() => {
                  close()
                  onSignOut()
                }}
                className={cn(menuRow, 'text-danger hover:bg-danger-soft')}
              >
                <LogOut size={17} aria-hidden="true" />
                {signOutLabel ?? t('actions.signOut')}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
