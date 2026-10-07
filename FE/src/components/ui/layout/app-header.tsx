import {
  useId,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type ComponentProps,
  type ReactNode,
  type Ref,
} from 'react'
import { Menu, Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTranslation } from 'react-i18next'
import { useTheme } from '@/hooks/useTheme'
import { AppAccountMenu } from './app-account-menu'
import { NotificationBell, type ShellNotification } from './notification-bell'
import { Link, useNavigate } from 'react-router-dom'

interface AppHeaderProps {
  context: ReactNode
  account: Omit<
    ComponentProps<typeof AppAccountMenu>,
    'isDark' | 'onToggleTheme'
  >
  notifications?: ShellNotification[]
  onOpenNavigation?: () => void
  navigationButtonRef?: Ref<HTMLButtonElement>
  navigationButtonClassName?: string
  className?: string
  search?: { value: string; onChange: (value: string) => void; label: string }
  searchLinks?: { label: string; to: string }[]
}

/** One app bar for every workspace; layouts supply only their data and navigation. */
export function AppHeader({
  context,
  account,
  notifications = [],
  onOpenNavigation,
  navigationButtonRef,
  navigationButtonClassName = 'md:hidden',
  className,
  search: pageSearch,
  searchLinks = [],
}: AppHeaderProps) {
  const { t } = useTranslation('common')
  const { isDark, toggleTheme } = useTheme()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const search = pageSearch ?? {
    value: query,
    onChange: setQuery,
    label: t('search.pages'),
  }
  const results = searchLinks.filter((link) =>
    link.label.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())
  )
  const [searchOpen, setSearchOpen] = useState(false)
  const searchId = useId()
  const searchInput = useRef<HTMLInputElement>(null)
  const searchTrigger = useRef<HTMLButtonElement>(null)
  return (
    <header
      className={cn(
        'font-num sticky top-0 z-20 grid min-h-18 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-2 gap-y-3 border-b px-3 py-3 sm:px-5 md:px-8',
        search && 'xl:grid-cols-[minmax(0,1fr)_minmax(180px,288px)_auto]',
        'border-hairline bg-header text-text-strong',
        className
      )}
    >
      <div className="text-text-muted order-1 flex min-w-0 items-center gap-2 text-sm sm:gap-3">
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
        <div className="min-w-0 truncate [&>nav]:truncate">{context}</div>
      </div>
      {
        <div
          className={cn(
            'order-2 flex shrink-0 items-center gap-1 sm:gap-2 xl:order-3'
          )}
        >
          {search && (
            <button
              ref={searchTrigger}
              type="button"
              aria-label={search.label}
              title={search.label}
              aria-expanded={searchOpen}
              aria-controls={searchId}
              onClick={() => {
                const next = !searchOpen
                setSearchOpen(next)
                if (next)
                  requestAnimationFrame(() => searchInput.current?.focus())
              }}
              className="rounded-control text-text-muted hover:bg-surface-muted flex size-11 items-center justify-center xl:hidden"
            >
              <Search size={20} aria-hidden="true" />
            </button>
          )}
          <NotificationBell notifications={notifications} />
          <AppAccountMenu
            {...account}
            onSignOut={
              account.onSignOut ?? (() => navigate('/login', { replace: true }))
            }
            signOutLabel={
              account.signOutLabel ??
              (account.onSignOut ? undefined : t('actions.exitDemo'))
            }
            isDark={isDark}
            onToggleTheme={toggleTheme}
          />
        </div>
      }
      {search && (
        <div
          className={cn(
            'relative order-3 col-span-2 xl:order-2 xl:col-span-1',
            searchOpen ? 'block' : 'hidden xl:block'
          )}
        >
          <label
            id={searchId}
            className={cn(
              'border-border-control bg-surface focus-within:outline-accent-text order-3 col-span-2 min-h-11 min-w-0 items-center gap-2 rounded-lg border px-3 focus-within:outline-2 focus-within:outline-offset-2 xl:order-2 xl:col-span-1 xl:flex',
              searchOpen ? 'flex' : 'hidden'
            )}
          >
            <Search
              size={18}
              aria-hidden="true"
              className="text-text-muted shrink-0"
            />
            <input
              ref={searchInput}
              type="search"
              value={search.value}
              onChange={(event) => search.onChange(event.target.value)}
              placeholder={search.label}
              aria-label={search.label}
              onKeyDown={(event) => {
                if (event.key === 'Escape' && searchOpen) {
                  event.preventDefault()
                  setSearchOpen(false)
                  searchTrigger.current?.focus()
                }
              }}
              className="text-text-strong placeholder:text-text-muted w-full min-w-0 bg-transparent text-sm outline-none"
            />
          </label>
          {!pageSearch && query.trim() && (
            <div className="bg-surface shadow-overlay absolute top-full right-0 left-0 z-50 mt-2 max-h-64 overflow-y-auto rounded-xl p-1.5">
              {results.length ? (
                results.map((link) => (
                  <Link
                    key={link.to}
                    to={link.to}
                    onClick={() => {
                      setQuery('')
                      setSearchOpen(false)
                    }}
                    className="text-text-strong hover:bg-accent-soft flex min-h-11 items-center rounded-lg px-3 text-sm"
                  >
                    {link.label}
                  </Link>
                ))
              ) : (
                <p role="status" className="text-text-muted p-3 text-sm">
                  {t('search.noPages')}
                </p>
              )}
            </div>
          )}
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
