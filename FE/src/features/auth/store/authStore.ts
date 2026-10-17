import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User } from '../types'
import { clearPrivateQueries } from '@/lib/query-client'
import { setAccessToken } from '@/lib/access-token'

interface AuthStore {
  user: User | null
  /** Access token in memory only; it is not persisted (see lib/access-token). */
  token: string | null
  isAuthenticated: boolean
  sessionScope: string
  setSession: (user: User, token: string) => void
  /** New access token after a refresh: keeps the data on screen when it is still the same account */
  renewSession: (user: User, token: string) => void
  clearSession: () => void
  /** Updates part of the signed-in user's info (e.g. the avatar) */
  updateUser: (patch: Partial<User>) => void
}

/* Tabs share the session through this channel (same origin only) instead of localStorage:
 * sign-in, refresh and sign-out in one tab reach the others without writing the token to storage. */
type SessionMessage = { type: 'session'; user: User; token: string } | { type: 'signed-out' }
const channel =
  typeof BroadcastChannel === 'undefined' ? null : new BroadcastChannel('caps-auth-session')
const broadcast = (message: SessionMessage) => channel?.postMessage(message)

// Older builds kept the token in these keys; remove them so no token stays in storage.
try {
  localStorage.removeItem('auth_token')
  localStorage.removeItem('auth_user')
} catch {
  // Storage may be unavailable (private mode); nothing to clean up then.
}

type Set = (fn: (s: AuthStore) => Partial<AuthStore>) => void

function applySession(set: Set, user: User, token: string) {
  setAccessToken(token)
  set((s) => {
    // Another account signed in: drop the previous account's data
    if (s.user && s.user.id !== user.id) {
      clearPrivateQueries()
      return { user, token, isAuthenticated: true, sessionScope: crypto.randomUUID() }
    }
    return { user, token, isAuthenticated: true }
  })
}

function applySignOut(set: Set) {
  clearPrivateQueries()
  setAccessToken(null)
  set(() => ({ user: null, token: null, isAuthenticated: false, sessionScope: crypto.randomUUID() }))
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
        setAccessToken(token)
        set({ user, token, isAuthenticated: true, sessionScope: crypto.randomUUID() })
        broadcast({ type: 'session', user, token })
      },
      renewSession: (user, token) => {
        applySession(set, user, token)
        broadcast({ type: 'session', user, token })
      },
      updateUser: (patch) =>
        set((s) => (s.user ? { user: { ...s.user, ...patch } } : s)),
      clearSession: () => {
        applySignOut(set)
        broadcast({ type: 'signed-out' })
      },
    }),
    {
      name: 'caps-auth',
      // Only what the UI needs to render right away; the token is never written to storage
      partialize: (s) => ({ user: s.user, isAuthenticated: s.isAuthenticated }) as AuthStore,
      version: 1,
      // Version 0 also stored the token: drop it
      migrate: (persisted) => {
        const { user = null, isAuthenticated = false } = (persisted ?? {}) as Partial<AuthStore>
        return { user, isAuthenticated } as AuthStore
      },
      // A reloaded tab is still signed in through the refresh cookie; api-client gets a new access token
      onRehydrateStorage: () => (state) => setAccessToken(null, state?.isAuthenticated ?? false),
    },
  ),
)

channel?.addEventListener('message', (event: MessageEvent<SessionMessage>) => {
  const set: Set = (fn) => useAuthStore.setState(fn)
  if (event.data.type === 'session') applySession(set, event.data.user, event.data.token)
  else if (useAuthStore.getState().isAuthenticated) applySignOut(set)
})
