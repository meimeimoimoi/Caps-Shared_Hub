import { useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/features/auth/store/authStore'
import { authApi } from '@/features/auth/api/authApi'
import { applicationApi, type ExpertApplication } from '../api/applicationApi'
import { queryClient } from '@/lib/query-client'

/** Đánh dấu người dùng đang đăng ký chuyên gia: trang xác thực email đưa họ quay lại wizard. */
export const EXPERT_ONBOARDING_KEY = 'caps-expert-onboarding'

export function markExpertOnboarding() {
  try {
    localStorage.setItem(EXPERT_ONBOARDING_KEY, '1')
  } catch {
    // Chế độ riêng tư chặn storage: chỉ mất phần tự quay lại wizard
  }
}

/** Server-owned application, shared across sign-up and the application page within one session. */
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

  /**
   * Gets a new token once the email may have been verified (another tab or device). The expert
   * service and the avatar API trust the token's ACTIVE status, not a database lookup.
   */
  const syncVerifiedSession = useCallback(async () => {
    const store = useAuthStore.getState()
    if (store.user?.status === 'ACTIVE') return
    try {
      const { user, token } = await authApi.refresh()
      store.renewSession(user, token)
    } catch {
      // A failed refresh is already handled by the api-client; do not block the current action
    }
  }, [])

  return {
    application: query.data ?? null,
    setApplication,
    loading: enabled && !!userId && query.isPending,
    loadFailed: query.isError,
    reload: query.refetch,
    syncVerifiedSession,
  }
}
