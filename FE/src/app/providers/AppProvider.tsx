import * as React from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from '@/shared/lib/query-client'
import { useAuthStore } from '@/features/auth'
import { SESSION_EXPIRED_EVENT } from '@/shared/lib/session-events'

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
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen bg-slate-950 text-slate-100 antialiased selection:bg-indigo-500 selection:text-white">
        {children}
      </div>
    </QueryClientProvider>
  )
}
