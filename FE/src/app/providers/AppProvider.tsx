import * as React from 'react'
import { ThemeProvider } from './ThemeProvider'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from '@/lib/query-client'
import { useAuthStore } from '@/features/auth'
import { SESSION_EXPIRED_EVENT } from '@/lib/session-events'
import { I18nextProvider } from 'react-i18next'
import { i18n, subscribeLanguageStorage } from '@/lib/i18n'

interface AppProviderProps {
  children: React.ReactNode
}

export function AppProvider({ children }: AppProviderProps) {
  React.useEffect(subscribeLanguageStorage, [])
  React.useEffect(() => {
    const expire = () => useAuthStore.getState().clearSession()
    window.addEventListener(SESSION_EXPIRED_EVENT, expire)
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, expire)
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
