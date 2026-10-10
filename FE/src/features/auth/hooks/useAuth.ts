import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { safeReturnPath } from '../utils/returnPath'
import { authApi } from '../api/authApi'
import { useAuthStore } from '../store/authStore'
import type { LoginFormValues } from '../types'
import { useTranslation } from 'react-i18next'
import { ApiError } from '@/lib/api-client'

const unavailable = (e: unknown) =>
  e instanceof ApiError && (e.status == null || e.status >= 500)

export function useAuth() {
  const { t } = useTranslation('auth')
  const { user, isAuthenticated, setSession, clearSession } = useAuthStore()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<
    | 'errors.credentials'
    | 'errors.emailTaken'
    | 'errors.registerFailed'
    | 'errors.unavailable'
    | 'errors.failed'
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
      // BE trả 404 khi email chưa đăng ký và 422 khi sai mật khẩu; cả hai đều là sai thông tin
      // đăng nhập, gộp chung để không lộ email nào đã có tài khoản.
      setError(
        e instanceof ApiError &&
          (e.status === 401 || e.status === 404 || e.status === 422)
          ? 'errors.credentials'
          : unavailable(e)
            ? 'errors.unavailable'
            : 'errors.failed'
      )
      throw e
    } finally {
      setIsLoading(false)
    }
  }

  const register = async (values: {
    name: string
    email: string
    password: string
  }) => {
    setIsLoading(true)
    setError(null)
    try {
      const { user: u, token } = await authApi.register({
        email: values.email,
        password: values.password,
        displayName: values.name,
      })
      setSession(u, token)
      navigate(safeReturnPath(location.state?.from), { replace: true })
      return u
    } catch (e) {
      // BE trả 422 khi email đã có tài khoản
      setError(
        e instanceof ApiError && e.status === 422
          ? 'errors.emailTaken'
          : unavailable(e)
            ? 'errors.unavailable'
            : 'errors.registerFailed'
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
