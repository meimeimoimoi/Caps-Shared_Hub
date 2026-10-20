import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { customerRegistrationReturnPath, expertLoginReturnPath, safeReturnPath } from '../utils/returnPath'
import { hasAnyPermission, Permission, staffHomePath } from '../utils/permissions'
import { authApi } from '../api/authApi'
import { useAuthStore } from '../store/authStore'
import type { LoginFormValues, User } from '../types'
import { useTranslation } from 'react-i18next'
import { ApiError } from '@/lib/api-client'
// Direct file import: the expert-context index re-exports hooks that import this feature
import { hasExpertApplication } from '@/features/expert-context/api/expertContextApi'
import { EXPERT_ONBOARDING_KEY } from '@/features/expert-registration/hooks/useExpertApplication'

const unavailable = (e: unknown) =>
  e instanceof ApiError && (e.status == null || e.status >= 500)
const throttled = (e: unknown) => e instanceof ApiError && e.status === 429

export function useAuth() {
  const { t } = useTranslation('auth')
  const { user, isAuthenticated, setSession, clearSession } = useAuthStore()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<
    | 'errors.credentials'
    | 'errors.google'
    | 'errors.googleEmail'
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

  // Shared by every sign-in path: store the session, then go to verification or back to the requested page
  const enter = async (u: User, token: string) => {
    setSession(u, token)
    const state = {
      from: location.state?.from,
      fromState: location.state?.fromState,
    }
    const staffHome = staffHomePath(u)
    if (staffHome && u.status !== 'PENDING_VERIFICATION') {
      navigate(safeReturnPath(state.from, staffHome), {
        replace: true,
        state: state.fromState,
      })
      return
    }
    // Existing experts may have permissions without an application created by the current onboarding flow.
    const applicant = hasAnyPermission(u, [Permission.ServiceManage, Permission.CaseWork])
      || await hasExpertApplication()
    if (applicant)
      navigate(u.status === 'PENDING_VERIFICATION' ? '/expert/application' : expertLoginReturnPath(state.from), { replace: true, state: state.fromState })
    else if (u.status === 'PENDING_VERIFICATION')
      navigate('/verify-email', { replace: true, state })
    else
      navigate(safeReturnPath(state.from), {
        replace: true,
        state: state.fromState,
      })
  }

  const login = async (values: LoginFormValues) => {
    setIsLoading(true)
    setError(null)
    try {
      const { user: u, token } = await authApi.login(values)
      await enter(u, token)
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

  const loginWithGoogle = async (idToken: string) => {
    setIsLoading(true)
    setError(null)
    try {
      const { user: u, token } = await authApi.loginWithGoogle(idToken)
      await enter(u, token)
      return u
    } catch (e) {
      setError(
        e instanceof ApiError && e.code === 'GOOGLE_EMAIL_UNVERIFIED'
          ? 'errors.googleEmail'
          : e instanceof ApiError && (e.status === 400 || e.status === 401)
            ? 'errors.google'
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
      // A previous expert sign-up must not redirect this customer's verification link.
      try {
        localStorage.removeItem(EXPERT_ONBOARDING_KEY)
      } catch {
        // Storage may be unavailable; registration can still continue.
      }
      // New accounts verify their email before entering the customer workspace.
      navigate('/verify-email', {
        replace: true,
        state: {
          from: customerRegistrationReturnPath(location.state?.from),
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
    // Revoke the refresh cookie; network failures still allow local sign-out.
    await authApi.logout().catch(() => undefined)
    // Leave the protected route before clearing the session so its guard cannot capture a return path.
    await navigate('/login', { replace: true, state: null, flushSync: true })
    clearSession()
  }

  return {
    user,
    isAuthenticated,
    isLoading,
    error: error ? t(error) : null,
    login,
    loginWithGoogle,
    register,
    logout,
  }
}
