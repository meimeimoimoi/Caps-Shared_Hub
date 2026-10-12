import * as React from 'react'
import { ThemeProvider } from './ThemeProvider'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from '@/lib/query-client'
import { useAuthStore } from '@/features/auth'
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
    window.addEventListener(SESSION_EXPIRED_EVENT, expire)
    window.addEventListener(SESSION_REFRESHED_EVENT, renew)
    return () => {
      window.removeEventListener(SESSION_EXPIRED_EVENT, expire)
      window.removeEventListener(SESSION_REFRESHED_EVENT, renew)
    }
  }, [])
  // Mở/tải lại app: lấy lại hồ sơ từ server (trạng thái, role, avatar có thể đã đổi ở nơi khác).
  // Access token hết hạn thì api-client tự refresh; refresh thất bại thì phiên bị xoá.
  React.useEffect(() => {
    if (!useAuthStore.getState().isAuthenticated) return
    authApi
      .me()
      .then((user) => useAuthStore.getState().updateUser(user))
      .catch(() => undefined)
  }, [])
  return (
    <I18nextProvider i18n={i18n}>
      <ThemeProvider>
        <QueryClientProvider client={queryClient}>
          <div className="bg-desk-2 text-fg min-h-screen antialiased">
            {children}
          </div>
        </QueryClientProvider>
      </ThemeProvider>
    </I18nextProvider>
  )
}
