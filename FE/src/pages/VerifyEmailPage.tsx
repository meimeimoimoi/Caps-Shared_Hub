import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import {
  Link,
  Navigate,
  useLocation,
  useNavigate,
  useSearchParams,
} from 'react-router-dom'
import { CircleCheck, Loader2, Lock, MailCheck } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ApiError } from '@/lib/api-client'
import { authApi } from '@/features/auth/api/authApi'
import { useAuth, useAuthStore } from '@/features/auth'
import { safeReturnPath } from '@/features/auth/utils/returnPath'
import {
  notifyEmailVerified,
  useEmailVerifiedSignal,
} from '@/features/auth/utils/emailVerifiedSignal'
import { EXPERT_ONBOARDING_KEY } from '@/features/expert-registration/hooks/useExpertApplication'
import { VideoBackground } from '@/components/auth/VideoBackground'
import { EmailCodeField } from '@/components/auth/EmailCodeField'
import { LanguageToggle as AuthLanguageToggle } from '@/components/ui/layout/language-toggle'
import {
  CARD_CLASS,
  LINK_CLASS,
  PRIMARY_BUTTON_CLASS,
  TITLE_CLASS,
} from '@/components/auth/EmailLoginForm'

const COOLDOWN_SECONDS = 60
const BUTTON_LINK_CLASS = cn(PRIMARY_BUTTON_CLASS, 'font-sans no-underline')

/* Xác thực email sau khi đăng ký.
 * - Không có ?token: nhắc người dùng mở email, cho gửi lại liên kết.
 * - Có ?token (mở từ email): gọi verify-email rồi refresh để nhận token ACTIVE. */
export default function VerifyEmailPage() {
  const { t } = useTranslation('auth')
  useEffect(() => {
    document.title = `${t('verify.pageTitle')} | Shared Hub`
  }, [t])
  const token = useSearchParams()[0].get('token')
  const user = useAuthStore((s) => s.user)
  const authenticated = useAuthStore((s) => s.isAuthenticated)
  const location = useLocation()

  // Đã kích hoạt (kể cả vừa xác nhận ở tab khác): đi tiếp tới trang người dùng định vào
  if (!token && authenticated && user?.status === 'ACTIVE')
    return (
      <Navigate
        to={safeReturnPath(location.state?.from)}
        replace
        state={location.state?.fromState}
      />
    )

  return (
    <main className="login-material relative isolate flex min-h-svh flex-col items-center justify-center overflow-hidden bg-[var(--ui-login-canvas)] px-6 py-12 text-[var(--ui-login-text)] max-sm:pt-20">
      <VideoBackground />
      <div className="fixed top-[max(1rem,env(safe-area-inset-top))] right-[max(1rem,env(safe-area-inset-right))] z-50">
        <AuthLanguageToggle />
      </div>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-black/30"
      />
      <div className="relative z-2 w-full max-w-[440px]">
        <div className={CARD_CLASS}>
          {token ? <ConfirmToken token={token} /> : <Pending />}
        </div>
      </div>
    </main>
  )
}

function ConfirmToken({ token }: { token: string }) {
  const { t } = useTranslation('auth')
  const navigate = useNavigate()
  const location = useLocation()
  const [status, setStatus] = useState<'verifying' | 'done' | 'invalid'>(
    'verifying'
  )
  const [signedIn, setSignedIn] = useState(false)
  // Đăng ký từ cổng chuyên gia: xác nhận xong quay lại wizard; xóa dấu để lần sau không bị dẫn nhầm
  const [expertOnboarding] = useState(() => {
    try {
      const flagged = localStorage.getItem(EXPERT_ONBOARDING_KEY) === '1'
      localStorage.removeItem(EXPERT_ONBOARDING_KEY)
      return flagged
    } catch {
      return false
    }
  })
  // Token chỉ dùng được một lần: chặn StrictMode gọi effect hai lần
  const started = useRef(false)

  useEffect(() => {
    if (started.current) return
    started.current = true
    authApi
      .verifyEmail(token)
      .then(async () => {
        // Phiên cũ còn mang trạng thái PENDING_VERIFICATION; refresh để lấy token ACTIVE
        if (useAuthStore.getState().isAuthenticated) {
          try {
            const { user, token: access } = await authApi.refresh()
            useAuthStore.getState().renewSession(user, access)
            setSignedIn(true)
          } catch {
            useAuthStore.getState().clearSession()
          }
        }
        // Báo sau khi đã refresh xong để tab đang chờ dùng phiên mới, không refresh song song
        notifyEmailVerified()
        setStatus('done')
      })
      .catch(() => setStatus('invalid'))
  }, [token])

  if (status === 'verifying')
    return (
      <div className="py-6 text-center" role="status">
        <Loader2
          aria-hidden="true"
          size={32}
          className="mx-auto mb-4 animate-spin text-[var(--accent)] motion-reduce:animate-none"
        />
        <p className="text-[14px] text-[var(--body)]">
          {t('verify.verifying')}
        </p>
      </div>
    )

  if (status === 'invalid')
    return (
      <Outcome
        icon={<Lock size={40} aria-hidden="true" />}
        title={t('verify.invalidTitle')}
        body={t('verify.invalidBody')}
        action={
          <Link to="/verify-email" className={BUTTON_LINK_CLASS}>
            {t('verify.resend')}
          </Link>
        }
      />
    )

  return (
    <Outcome
      icon={<CircleCheck size={40} aria-hidden="true" />}
      title={t('verify.doneTitle')}
      body={t('verify.doneBody')}
      action={
        signedIn ? (
          <button
            type="button"
            onClick={() =>
              navigate(
                expertOnboarding
                  ? '/expert/register'
                  : safeReturnPath(location.state?.from),
                {
                  replace: true,
                  state: location.state?.fromState,
                }
              )
            }
            className={cn(PRIMARY_BUTTON_CLASS, 'font-sans')}
          >
            {t('verify.continue')}
          </button>
        ) : (
          <Link
            to="/login"
            state={
              expertOnboarding
                ? { view: 'email', from: '/expert/register' }
                : { view: 'email' }
            }
            className={BUTTON_LINK_CLASS}
          >
            {t('verify.signIn')}
          </Link>
        )
      }
    />
  )
}

function Pending() {
  const { t } = useTranslation('auth')
  const { logout } = useAuth()
  const user = useAuthStore((s) => s.user)
  const authenticated = useAuthStore((s) => s.isAuthenticated)
  const justRegistered = !!(
    useLocation().state as { justRegistered?: boolean } | null
  )?.justRegistered
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<'resent' | 'resendFailed' | null>(null)
  // Đã xác nhận ở tab/thiết bị khác: /users/me trả 401 REFRESH_REQUIRED, api-client tự refresh và
  // store nhận trạng thái ACTIVE, trang tự chuyển tiếp mà người dùng không phải bấm gì
  useEmailVerifiedSignal(() => {
    void authApi.me().catch(() => undefined)
  }, authenticated)
  // Vừa đăng ký xong thì BE đã gửi email, nên bắt đầu đếm ngược luôn
  const [cooldown, setCooldown] = useState(
    justRegistered ? COOLDOWN_SECONDS : 0
  )

  useEffect(() => {
    if (cooldown <= 0) return
    const timer = window.setTimeout(() => setCooldown((s) => s - 1), 1000)
    return () => window.clearTimeout(timer)
  }, [cooldown])

  const resend = () => {
    setBusy(true)
    setMessage(null)
    authApi
      .resendVerification()
      .then(() => {
        setMessage('resent')
        setCooldown(COOLDOWN_SECONDS)
      })
      .catch((e) => {
        if (e instanceof ApiError && e.status === 429)
          setCooldown(COOLDOWN_SECONDS)
        else setMessage('resendFailed')
      })
      .finally(() => setBusy(false))
  }

  return (
    <div className="text-center">
      <div className="mb-4 flex justify-center text-[var(--accent)]">
        <MailCheck size={40} aria-hidden="true" />
      </div>
      <h1 className={cn(TITLE_CLASS, 'font-sans')}>
        {t('verify.pendingTitle')}
      </h1>
      <p className="mb-7 text-[13px] leading-[1.6] text-[var(--body)]">
        {user?.email
          ? (
            <Trans
              ns="auth"
              i18nKey="verify.pendingBody"
              values={{ email: user.email }}
              components={{ strong: <strong className="text-white" /> }}
            />
          )
          : t('verify.pendingBodyNoEmail')}
      </p>

      {authenticated ? (
        <>
          {/* Nhập mã xong store nhận phiên ACTIVE và trang tự chuyển tiếp */}
          <EmailCodeField tone="dark" autoFocus />
          {/* Gửi lại là thao tác phụ: dòng chữ nhỏ dưới nút Xác nhận */}
          <p
            role="status"
            className="mt-4 min-h-[1.5em] text-[13px] text-white/60"
          >
            {message === 'resent' ? (
              t('verify.resent')
            ) : message === 'resendFailed' ? (
              t('verify.resendFailed')
            ) : (
              <>
                {t('verify.noCode')}{' '}
                <button
                  type="button"
                  onClick={resend}
                  disabled={busy || cooldown > 0}
                  aria-busy={busy}
                  className={cn(
                    LINK_CLASS,
                    'cursor-pointer font-semibold disabled:cursor-not-allowed disabled:opacity-60'
                  )}
                >
                  {busy
                    ? t('verify.resending')
                    : cooldown > 0
                      ? t('verify.resendIn', { seconds: cooldown })
                      : t('verify.resendShort')}
                </button>
              </>
            )}
          </p>
          <button
            type="button"
            onClick={() => void logout()}
            className={cn(LINK_CLASS, 'mt-2 text-[13px]')}
          >
            {t('verify.useOtherAccount')}
          </button>
        </>
      ) : (
        <>
          <p className="mb-4 text-[12.5px] text-white/60">
            {t('verify.signInToResend')}
          </p>
          <Link
            to="/login"
            state={{ view: 'email' }}
            className={BUTTON_LINK_CLASS}
          >
            {t('verify.signIn')}
          </Link>
        </>
      )}
    </div>
  )
}

function Outcome({
  icon,
  title,
  body,
  action,
}: {
  icon: ReactNode
  title: string
  body: string
  action: ReactNode
}) {
  return (
    <div className="text-center" role="status">
      <div className="mb-4 flex justify-center text-[var(--accent)]">
        {icon}
      </div>
      <h1 className={cn(TITLE_CLASS, 'font-sans')}>{title}</h1>
      <p className="mb-7 text-[13px] leading-[1.6] text-[var(--body)]">
        {body}
      </p>
      {action}
    </div>
  )
}
