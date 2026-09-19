import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User } from '../types'

interface AuthStore {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  setSession: (user: User, token: string) => void
  clearSession: () => void
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      setSession: (user, token) => {
        localStorage.setItem('auth_token', token)
        localStorage.setItem('auth_user', JSON.stringify(user))
        set({ user, token, isAuthenticated: true })
      },
      clearSession: () => {
        localStorage.removeItem('auth_token')
        localStorage.removeItem('auth_user')
        set({ user: null, token: null, isAuthenticated: false })
      },
    }),
    {
      name: 'caps-auth',
      partialize: (s) => ({ user: s.user, token: s.token, isAuthenticated: s.isAuthenticated }) as AuthStore,
    },
  ),
)
