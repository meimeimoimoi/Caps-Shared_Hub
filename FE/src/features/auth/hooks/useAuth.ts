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
const throttled = (e: unknown) => e instanceof ApiError && e.status === 429

export function useAuth() {
  const { t } = useTranslation('auth')
  const { user, isAuthenticated, setSession, clearSession } = useAuthStore()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<
    | 'errors.credentials'
    | 'errors.emailTaken'
    | 'errors.emailDisposable'
    | 'errors.emailDomain'
    | 'errors.registerFailed'
    | 'errors.unavailable'
    | 'errors.tooManyRequests'
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
      const state = {
        from: location.state?.from,
        fromState: location.state?.fromState,
      }
      if (u.status === 'PENDING_VERIFICATION')
        navigate('/verify-email', { replace: true, state })
      else
        navigate(safeReturnPath(state.from), {
          replace: true,
          state: state.fromState,
        })
      return u
    } catch (e) {
      // BE trả chung 401 INVALID_CREDENTIALS cho email chưa đăng ký, sai mật khẩu và tài khoản
      // đang bị khoá tạm, để không lộ email nào đã có tài khoản.
      setError(
        e instanceof ApiError && (e.status === 400 || e.status === 401)
          ? 'errors.credentials'
          : throttled(e)
            ? 'errors.tooManyRequests'
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
      // Tài khoản mới ở trạng thái PENDING_VERIFICATION: chờ người dùng bấm liên kết trong email
      navigate('/verify-email', {
        replace: true,
        state: {
          from: location.state?.from,
          fromState: location.state?.fromState,
          justRegistered: true,
        },
      })
      return u
    } catch (e) {
      // BE trả 409 EMAIL_EXISTS khi email đã có tài khoản
      setError(
        e instanceof ApiError && e.status === 409
          ? 'errors.emailTaken'
          : e instanceof ApiError && e.code === 'EMAIL_DISPOSABLE'
            ? 'errors.emailDisposable'
            : e instanceof ApiError && e.code === 'EMAIL_DOMAIN_INVALID'
              ? 'errors.emailDomain'
              : throttled(e)
                ? 'errors.tooManyRequests'
                : unavailable(e)
                  ? 'errors.unavailable'
                  : 'errors.registerFailed'
      )
      throw e
    } finally {
      setIsLoading(false)
    }
  }

  const logout = async () => {
    // Thu hồi refresh cookie phía BE; lỗi mạng vẫn đăng xuất cục bộ
    await authApi.logout().catch(() => undefined)
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
