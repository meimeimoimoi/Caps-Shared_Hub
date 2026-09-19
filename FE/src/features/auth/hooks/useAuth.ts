import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { authApi } from '../api/authApi'
import { useAuthStore } from '../store/authStore'
import type { LoginFormValues } from '../types'

export function useAuth() {
  const { user, isAuthenticated, setSession, clearSession } = useAuthStore()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()

  const login = async (values: LoginFormValues) => {
    setIsLoading(true)
    setError(null)
    try {
      const { user: u, token } = await authApi.login(values)
      setSession(u, token)
      navigate('/dashboard', { replace: true })
      return u
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Login failed'
      setError(msg)
      throw e
    } finally {
      setIsLoading(false)
    }
  }

  const logout = () => {
    clearSession()
    navigate('/login', { replace: true })
  }

  return { user, isAuthenticated, isLoading, error, login, logout }
}
