import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { customerRegistrationReturnPath, expertLoginReturnPath, safeReturnPath } from '../utils/returnPath'
import { hasAnyPermission, Permission, staffHomePath } from '../utils/permissions'
import { signupDestination, type SignupRole } from '../utils/signupRole'
import { authApi } from '../api/authApi'
import { useAuthStore } from '../store/authStore'
import type { LoginFormValues, User } from '../types'
import { useTranslation } from 'react-i18next'
import { ApiError } from '@/lib/api-client'
// Direct file import: the expert-context index re-exports hooks that import this feature
import { hasExpertApplication } from '@/features/expert-context/api/expertContextApi'

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

  /**
   * Shared by every sign-in path: store the session, then pick the next page in this order:
   * staff home → email verification → the role chosen at sign-up (new accounts only) → the one-time
   * role question (new account without a choice, or right after verifying elsewhere) → the usual home.
   */
  const enter = async (
    u: User,
    token: string,
    session: { isNewAccount?: boolean; role?: SignupRole } = {}
  ) => {
    setSession(u, token)
    const from = location.state?.from
    const fromState = location.state?.fromState
    const staffHome = staffHomePath(u)
    if (staffHome && u.status !== 'PENDING_VERIFICATION') {
      navigate(safeReturnPath(from, staffHome), { replace: true, state: fromState })
      return
    }
    // Every area needs a verified email; the role chosen at sign-up rides along
    if (u.status === 'PENDING_VERIFICATION') {
      navigate('/verify-email', {
        replace: true,
        state: { from, fromState, role: session.role },
      })
      return
    }
    // A role picked before Google sign-in only applies to the account that call created
    if (session.isNewAccount && session.role) {
      navigate(signupDestination(session.role, from), { replace: true, state: fromState })
      return
    }
    // Existing experts may have permissions without an application created by the current onboarding flow.
    // A failure propagates so a temporary outage cannot misclassify an applicant as a customer.
    const applicant = hasAnyPermission(u, [Permission.ServiceManage, Permission.CaseWork])
      || await hasExpertApplication()
    if (applicant) {
      navigate(expertLoginReturnPath(from), { replace: true, state: fromState })
      return
    }
    if (session.isNewAccount || location.state?.afterVerification) {
      navigate('/welcome', { replace: true, state: { welcome: true, from, fromState } })
      return
    }
    navigate(safeReturnPath(from), { replace: true, state: fromState })
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

  /** role: chosen on the sign-up page before Google; ignored when the account already existed. */
  const loginWithGoogle = async (idToken: string, role?: SignupRole) => {
    setIsLoading(true)
    setError(null)
    try {
      const { user: u, token, isNewAccount } = await authApi.loginWithGoogle(idToken)
      await enter(u, token, { isNewAccount, role })
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

  /** role: picked in the first sign-up step; it only decides the page after verification. */
  const register = async (
    values: {
      email: string
      password: string
    },
    role: SignupRole
  ) => {
    setIsLoading(true)
    setError(null)
    try {
      const { user: u, token } = await authApi.register({
        // No name at sign-up: the server shows the email's local part until the user sets one
        email: values.email,
        password: values.password,
      })
      setSession(u, token)
      // New accounts verify their email before entering any area
      navigate('/verify-email', {
        replace: true,
        state: {
          from: customerRegistrationReturnPath(location.state?.from),
          fromState: location.state?.fromState,
          justRegistered: true,
          role,
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
