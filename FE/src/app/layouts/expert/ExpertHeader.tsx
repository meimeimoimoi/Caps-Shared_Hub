import { useEffect, useRef } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { ChevronDown, LogOut, Menu, Settings, Moon, Sun } from 'lucide-react'
import { useAuth } from '@/features/auth'
import { useExpertContext } from '@/features/expert-context'
import { isExpertDemo } from '@/lib/expert-data-source'

export function ExpertHeader({
  openNavigation,
  isDark,
  toggleTheme,
  lang,
  toggleLang,
}: {
  openNavigation: () => void
  isDark: boolean
  toggleTheme: () => void
  lang: 'vi' | 'en'
  toggleLang: () => void
}) {
  const { data } = useExpertContext()
  const { logout } = useAuth()
  const account = useRef<HTMLDetailsElement>(null)
  const location = useLocation()
  const closeAccount = () => {
    if (account.current) account.current.open = false
  }
  useEffect(() => {
    const dismiss = (event: PointerEvent) => {
      if (
        event.target instanceof Node &&
        !account.current?.contains(event.target)
      ) {
        if (account.current) account.current.open = false
      }
    }
    document.addEventListener('pointerdown', dismiss)
    return () => document.removeEventListener('pointerdown', dismiss)
  }, [])
  useEffect(() => {
    if (account.current) account.current.open = false
  }, [location.pathname, location.search])
  return (
    <header className="ep-header">
      <div className="ep-header-start">
        <button
          className="ep-icon-button ep-menu-toggle"
          onClick={openNavigation}
          aria-label="Open navigation"
          aria-haspopup="dialog"
        >
          <Menu size={21} aria-hidden="true" />
        </button>
        <span>Expert workspace</span>
      </div>
      <div className="flex items-center gap-2 sm:gap-4">
        <button
          onClick={toggleLang}
          className="ep-icon-button flex items-center justify-center font-bold text-xs tracking-wider"
          aria-label="Toggle language"
        >
          {lang === 'vi' ? 'VI' : 'EN'}
        </button>
        <button
          onClick={toggleTheme}
          className="ep-icon-button"
          aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
        >
          {isDark ? <Sun size={19} /> : <Moon size={19} />}
        </button>
        <details
          className="group relative"
        ref={account}
        onKeyDown={(event) => {
          if (event.key === 'Escape' && account.current) {
            account.current.open = false
            account.current.querySelector('summary')?.focus()
          }
        }}
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node))
            event.currentTarget.open = false
        }}
      >
        <summary
          className="flex min-h-11 cursor-pointer list-none items-center gap-2.5 rounded-lg px-2 py-1 text-[var(--ep-ink)] transition-colors hover:bg-[var(--ep-surface-raised)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ep-muted)] [&::-webkit-details-marker]:hidden"
          aria-label={`Account menu for ${data?.displayName ?? 'your account'}`}
        >
          <span className="ep-avatar" aria-hidden="true">
            {data?.displayName
              .split(' ')
              .map((part) => part[0])
              .slice(0, 2)
              .join('')}
          </span>
          <span className="hidden max-w-40 truncate text-[13px] font-semibold sm:block">{data?.displayName}</span>
          <ChevronDown
            className="shrink-0 text-[var(--ep-muted)] transition-transform group-open:rotate-180 motion-reduce:transition-none"
            size={15}
            aria-hidden="true"
          />
        </summary>
        <div className={`absolute top-full right-0 z-50 mt-3 w-[min(304px,calc(100vw-32px))] rounded-xl p-2 text-[var(--ep-ink)] shadow-[0_16px_48px_-12px_rgba(0,0,0,0.35)] ring-1 ${isDark ? 'bg-[#262626] ring-white/15' : 'bg-white ring-black/10'}`}>
          <div className="flex flex-col gap-1 px-3 pt-3 pb-4">
            <strong className="text-[14px] font-semibold [overflow-wrap:anywhere]">{data?.displayName}</strong>
            <span className={`text-[13px] leading-relaxed [overflow-wrap:anywhere] ${isDark ? 'text-neutral-300' : 'text-neutral-600'}`}>{data?.email}</span>
            {isExpertDemo && (
              <span className={`mt-2 self-start rounded-md px-2 py-1 text-[11px] font-medium ${isDark ? 'bg-neutral-700 text-neutral-100' : 'bg-neutral-100 text-neutral-700'}`}>
                Demonstration account
              </span>
            )}
          </div>
          <nav aria-label="Account navigation" className={`border-t pt-2 ${isDark ? 'border-white/15' : 'border-black/10'}`}>
            <NavLink
              className={`flex min-h-11 w-full items-center gap-3 rounded-lg px-3 py-2.5 text-[14px] font-semibold no-underline transition-colors focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--ep-accent)] ${isDark ? location.pathname.startsWith('/expert/settings') ? 'bg-neutral-600 text-white hover:bg-neutral-500' : 'text-neutral-100 hover:bg-neutral-700' : location.pathname.startsWith('/expert/settings') ? 'bg-orange-50 text-orange-800 hover:bg-orange-100' : 'text-neutral-900 hover:bg-neutral-100'}`}
              to={{
                pathname: '/expert/settings/account',
                search: location.search,
              }}
              onClick={closeAccount}
            >
              <Settings size={17} aria-hidden="true" />
              Settings
            </NavLink>
          </nav>
          <div className={`mt-2 border-t pt-2 ${isDark ? 'border-white/15' : 'border-black/10'}`}>
            <button
              className={`flex min-h-11 w-full cursor-pointer items-center gap-3 rounded-lg border-0 bg-transparent px-3 py-2.5 text-left text-[14px] font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--ep-accent)] ${isDark ? 'text-red-200 hover:bg-neutral-700' : 'text-red-700 hover:bg-red-50'}`}
              onClick={() => {
                closeAccount()
                logout()
              }}
            >
              <LogOut size={17} aria-hidden="true" />
              Sign out
            </button>
          </div>
        </div>
      </details>
      </div>
    </header>
  )
}
