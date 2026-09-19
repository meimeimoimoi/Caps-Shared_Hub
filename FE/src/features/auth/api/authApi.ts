import { api } from '@/lib/api-client'
import type { LoginFormValues, User } from '../types'

interface BackendEnvelope<T> {
  success: boolean
  data: T
  message?: string
}

interface BackendAuthPayload {
  accessToken: string
  userId: string
  email: string
  displayName: string
}

function toUser(p: BackendAuthPayload): { user: User; token: string } {
  return {
    user: { id: p.userId, email: p.email, name: p.displayName },
    token: p.accessToken,
  }
}

export const authApi = {
  login: async (values: LoginFormValues) => {
    const res = await api.post<BackendEnvelope<BackendAuthPayload>>('/api/auth/login', values)
    return toUser(res.data)
  },
  register: async (values: LoginFormValues & { displayName?: string }) => {
    const res = await api.post<BackendEnvelope<BackendAuthPayload>>('/api/auth/register', values)
    return toUser(res.data)
  },
  me: () => api.get<BackendEnvelope<{ userId: string; email: string }>>('/api/auth/me'),
}
