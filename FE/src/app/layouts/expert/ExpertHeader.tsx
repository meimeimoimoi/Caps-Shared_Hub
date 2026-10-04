import { useEffect, useRef } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { ChevronDown, LogOut, Menu, Settings } from 'lucide-react'
import { useAuth } from '@/features/auth'
import { useExpertContext } from '@/features/expert-context'
import { isExpertDemo } from '@/shared/lib/expert-data-source'

export function ExpertHeader({
  openNavigation,
}: {
  openNavigation: () => void
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
      <details
        className="ep-account"
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
          aria-label={`Account menu for ${data?.displayName ?? 'your account'}`}
        >
          <span className="ep-avatar" aria-hidden="true">
            {data?.displayName
              .split(' ')
              .map((part) => part[0])
              .slice(0, 2)
              .join('')}
          </span>
          <span className="ep-account-name">{data?.displayName}</span>
          <ChevronDown
            className="ep-account-chevron"
            size={15}
            aria-hidden="true"
          />
        </summary>
        <div className="ep-account-popover">
          <div className="ep-account-identity">
            <strong>{data?.displayName}</strong>
            <span>{data?.email}</span>
            {isExpertDemo && (
              <span className="ep-account-demo-label">
                Demonstration account
              </span>
            )}
          </div>
          <nav aria-label="Account navigation">
            <NavLink
              className={`ep-account-action ${location.pathname.startsWith('/expert/settings') ? 'is-current' : ''}`}
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
          <div className="ep-account-signout">
            <button
              className="ep-account-action"
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
    </header>
  )
}
