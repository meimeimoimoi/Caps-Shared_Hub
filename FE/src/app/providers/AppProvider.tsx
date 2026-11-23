import * as React from 'react'
import { ThemeProvider } from './ThemeProvider'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from '@/lib/query-client'
import { useAuthStore } from '@/features/auth'
import { NotificationStream } from '@/features/notifications'
import { SESSION_EXPIRED_EVENT, SESSION_REFRESHED_EVENT } from '@/lib/session-events'
import { authApi, toUser, type BackendMe } from '@/features/auth/api/authApi'
import { I18nextProvider } from 'react-i18next'
import { i18n, subscribeLanguageStorage } from '@/lib/i18n'

interface AppProviderProps {
  children: React.ReactNode
}

export function AppProvider({ children }: AppProviderProps) {
  React.useEffect(subscribeLanguageStorage, [])
  React.useEffect(() => {
    const expire = () => useAuthStore.getState().clearSession()
    // api-client tự refresh access token khi gặp 401; đồng bộ token/role mới vào store
    const renew = (event: Event) => {
      const { accessToken, user } = (event as CustomEvent<{ accessToken: string; user: BackendMe }>).detail
      useAuthStore.getState().renewSession(toUser(user), accessToken)
    }
    // Other tabs follow sign-in, refresh and sign-out through the store's BroadcastChannel
    window.addEventListener(SESSION_EXPIRED_EVENT, expire)
    window.addEventListener(SESSION_REFRESHED_EVENT, renew)
    return () => {
      window.removeEventListener(SESSION_EXPIRED_EVENT, expire)
      window.removeEventListener(SESSION_REFRESHED_EVENT, renew)
    }
  }, [])
  // App opened or reloaded: reload the profile (status, roles, avatar may have changed elsewhere).
  // The access token is not persisted, so api-client first gets one through the refresh cookie;
  // if that fails the session is cleared.
  React.useEffect(() => {
    const session = useAuthStore.getState()
    if (!session.isAuthenticated) return
    let cancelled = false
    authApi
      .me()
      .then((user) => {
        const current = useAuthStore.getState()
        if (!cancelled && current.sessionScope === session.sessionScope && current.user?.id === user.id)
          current.updateUser(user)
      })
      .catch(() => undefined)
    return () => { cancelled = true }
  }, [])
  return (
    <I18nextProvider i18n={i18n}>
      <ThemeProvider>
        <QueryClientProvider client={queryClient}>
          <NotificationStream />
          <div className="bg-desk-2 text-fg min-h-screen antialiased">
            {children}
          </div>
        </QueryClientProvider>
      </ThemeProvider>
    </I18nextProvider>
  )
}
