import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User } from '../types'
import { clearPrivateQueries } from '@/lib/query-client'

interface AuthStore {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  sessionScope: string
  setSession: (user: User, token: string) => void
  clearSession: () => void
  /** Cập nhật một phần thông tin user đang đăng nhập (vd. ảnh đại diện) */
  updateUser: (patch: Partial<User>) => void
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      sessionScope: crypto.randomUUID(),
      setSession: (user, token) => {
        clearPrivateQueries()
        localStorage.setItem('auth_token', token)
        localStorage.setItem('auth_user', JSON.stringify(user))
        set({ user, token, isAuthenticated: true, sessionScope: crypto.randomUUID() })
      },
      updateUser: (patch) =>
        set((s) => {
          if (!s.user) return s
          const user = { ...s.user, ...patch }
          localStorage.setItem('auth_user', JSON.stringify(user))
          return { user }
        }),
      clearSession: () => {
        clearPrivateQueries()
        localStorage.removeItem('auth_token')
        localStorage.removeItem('auth_user')
        set({ user: null, token: null, isAuthenticated: false, sessionScope: crypto.randomUUID() })
      },
    }),
    {
      name: 'caps-auth',
      partialize: (s) => ({ user: s.user, token: s.token, isAuthenticated: s.isAuthenticated }) as AuthStore,
    },
  ),
)
