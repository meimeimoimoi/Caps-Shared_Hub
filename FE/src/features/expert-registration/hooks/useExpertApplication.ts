import { useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/features/auth/store/authStore'
import { applicationApi, type ExpertApplication } from '../api/applicationApi'
import { queryClient } from '@/lib/query-client'

/** Server-owned application of the signed-in account, shared by the application page within one session. */
export function useExpertApplication({ enabled = true } = {}) {
  const userId = useAuthStore((s) =>
    s.isAuthenticated ? (s.user?.id ?? null) : null
  )
  const sessionScope = useAuthStore((s) => s.sessionScope)
  const query = useQuery({
    queryKey: ['private', userId, sessionScope, 'expert-application'],
    // Share in-flight reads across StrictMode mounts without aborting and restarting them.
    queryFn: () => applicationApi.get(),
    enabled: enabled && !!userId,
    staleTime: 30_000,
    retry: false,
  })

  const setApplication = useCallback((application: ExpertApplication) => {
    const session = useAuthStore.getState()
    if (!session.isAuthenticated || !session.user) return
    const key = ['private', session.user.id, session.sessionScope, 'expert-application']
    // A read started before saving must not overwrite the newer mutation response.
    void queryClient.cancelQueries({ queryKey: key, exact: true })
    queryClient.setQueryData(key, application)
  }, [])

  return {
    application: query.data ?? null,
    setApplication,
    loading: enabled && !!userId && query.isPending,
    loadFailed: query.isError,
    reload: query.refetch,
  }
}
