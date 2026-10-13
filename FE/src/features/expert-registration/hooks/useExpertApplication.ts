import { useCallback, useEffect, useState } from 'react'
import { useAuthStore } from '@/features/auth/store/authStore'
import { authApi } from '@/features/auth/api/authApi'
import { applicationApi, type ExpertApplication } from '../api/applicationApi'

/** Đánh dấu người dùng đang đăng ký chuyên gia: trang xác thực email đưa họ quay lại wizard. */
export const EXPERT_ONBOARDING_KEY = 'caps-expert-onboarding'

export function markExpertOnboarding() {
  try {
    localStorage.setItem(EXPERT_ONBOARDING_KEY, '1')
  } catch {
    // Chế độ riêng tư chặn storage: chỉ mất phần tự quay lại wizard
  }
}

interface Loaded {
  /** Hồ sơ này thuộc user nào; đổi tài khoản thì coi như chưa tải */
  userId: string
  application: ExpertApplication | null
  failed: boolean
}

/** Hồ sơ đăng ký chuyên gia lấy từ máy chủ; mọi thay đổi đều đi qua API rồi cập nhật lại từ phản hồi. */
export function useExpertApplication() {
  const userId = useAuthStore((s) =>
    s.isAuthenticated ? (s.user?.id ?? null) : null
  )
  const [loaded, setLoaded] = useState<Loaded | null>(null)

  const reload = useCallback(async () => {
    const id = useAuthStore.getState().user?.id
    if (!id) return
    try {
      setLoaded({
        userId: id,
        application: await applicationApi.get(),
        failed: false,
      })
    } catch {
      setLoaded({ userId: id, application: null, failed: true })
    }
  }, [])

  useEffect(() => {
    if (!userId) return
    let cancelled = false
    applicationApi.get().then(
      (application) => {
        if (!cancelled) setLoaded({ userId, application, failed: false })
      },
      () => {
        if (!cancelled) setLoaded({ userId, application: null, failed: true })
      }
    )
    return () => {
      cancelled = true
    }
  }, [userId])

  const current = loaded && loaded.userId === userId ? loaded : null

  const setApplication = useCallback((application: ExpertApplication) => {
    const id = useAuthStore.getState().user?.id
    if (id) setLoaded({ userId: id, application, failed: false })
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
    application: current?.application ?? null,
    setApplication,
    loading: !!userId && !current,
    loadFailed: current?.failed ?? false,
    reload,
    syncVerifiedSession,
  }
}
