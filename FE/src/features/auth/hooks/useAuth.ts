import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { safeReturnPath } from '../utils/returnPath'
import { authApi } from '../api/authApi'
import { useAuthStore } from '../store/authStore'
import type { LoginFormValues, RegisterFormValues } from '../types'
import { useTranslation } from 'react-i18next'
import { ApiError } from '@/lib/api-client'

export function useAuth() {
  const { t } = useTranslation('auth')
  const { user, isAuthenticated, setSession, clearSession } = useAuthStore()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<
    | 'errors.credentials'
    | 'errors.unavailable'
    | 'errors.failed'
    | 'register.errors.emailTaken'
    | 'register.errors.unavailable'
    | 'register.errors.failed'
    | null
  >(null)
  const navigate = useNavigate()
  const location = useLocation()

  const login = async (values: LoginFormValues) => {
    setIsLoading(true)
    setError(null)
    try {
      const { user: u, token } = await authApi.login(values)
      setSession(u, token)
      navigate(safeReturnPath(location.state?.from), { replace: true })
      return u
    } catch (e) {
      setError(
        e instanceof ApiError && e.status === 401
          ? 'errors.credentials'
          : e instanceof ApiError && (e.status == null || e.status >= 500)
            ? 'errors.unavailable'
            : 'errors.failed'
      )
      throw e
    } finally {
      setIsLoading(false)
    }
  }

  const register = async (values: RegisterFormValues) => {
    setIsLoading(true)
    setError(null)
    try {
      const { user: u, token } = await authApi.register({
        email: values.email.trim(),
        password: values.password,
        displayName: values.name.trim(),
      })
      setSession(u, token)
      navigate(safeReturnPath(location.state?.from), { replace: true })
      return u
    } catch (e) {
      setError(
        e instanceof ApiError && e.status === 409
          ? 'register.errors.emailTaken'
          : e instanceof ApiError && (e.status == null || e.status >= 500)
            ? 'register.errors.unavailable'
            : 'register.errors.failed'
      )
      throw e
    } finally {
      setIsLoading(false)
    }
  }

  const logout = () => {
    clearSession()
    navigate('/login', { replace: true })
  }

  return {
    user,
    isAuthenticated,
    isLoading,
    error: error ? t(error) : null,
    login,
    register,
    logout,
  }
}
