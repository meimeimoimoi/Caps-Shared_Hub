import * as React from 'react'
import { ThemeProvider } from './ThemeProvider'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from '@/lib/query-client'
import { useAuthStore } from '@/features/auth'
import { SESSION_EXPIRED_EVENT } from '@/lib/session-events'

interface AppProviderProps {
  children: React.ReactNode
}

export function AppProvider({ children }: AppProviderProps) {
  React.useEffect(() => {
    const expire = () => useAuthStore.getState().clearSession()
    window.addEventListener(SESSION_EXPIRED_EVENT, expire)
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, expire)
  }, [])
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <div className="bg-desk-2 text-fg selection:bg-accent-soft selection:text-accent-text min-h-screen antialiased">
          {children}
        </div>
      </QueryClientProvider>
    </ThemeProvider>
  )
}
