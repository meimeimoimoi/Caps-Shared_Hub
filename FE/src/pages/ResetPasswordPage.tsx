import {
  useEffect,
  useId,
  useState,
  type FormEvent,
  type ReactNode,
} from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useSearchParams } from 'react-router-dom'
import { Circle, CircleCheck, Lock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { authApi } from '@/features/auth/api/authApi'
import { passwordRequirements } from '@/features/auth'
import { VideoBackground } from '@/components/auth/VideoBackground'
import { AuthLanguageToggle } from '@/components/auth/AuthLanguageToggle'
import {
  CARD_CLASS,
  ERROR_CLASS,
  FIELD_ICON_CLASS,
  INPUT_CLASS,
  INPUT_ERROR_CLASS,
  LABEL_CLASS,
  PRIMARY_BUTTON_CLASS,
  TITLE_CLASS,
} from '@/components/auth/EmailLoginForm'

/* Bước 2 của quên mật khẩu: mở từ liên kết trong email, ?token=... */
export default function ResetPasswordPage() {
  const { t } = useTranslation('auth')
  useEffect(() => {
    document.title = `${t('reset.title')} | Shared Hub`
  }, [t])
  const token = useSearchParams()[0].get('token')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [show, setShow] = useState(false)
  const [tried, setTried] = useState(false)
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState<'form' | 'done' | 'invalid'>(
    token ? 'form' : 'invalid'
  )
  const id = useId()

  const rules = passwordRequirements(password)
  const weak = rules.some((r) => !r.met)
  const mismatch = confirm !== password
  const type = show ? 'text' : 'password'

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (busy) return
    setTried(true)
    if (weak || mismatch || !token) return
    setBusy(true)
    authApi
      .resetPassword({ token, newPassword: password })
      .then(() => setStatus('done'))
      .catch(() => setStatus('invalid'))
      .finally(() => setBusy(false))
  }

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
          {status === 'done' ? (
            <Outcome
              icon={<CircleCheck size={40} aria-hidden="true" />}
              title={t('reset.doneTitle')}
              body={t('reset.doneBody')}
              action={
                <Link
                  to="/login"
                  className={cn(PRIMARY_BUTTON_CLASS, 'font-sans no-underline')}
                >
                  {t('forgot.backToSignIn')}
                </Link>
              }
            />
          ) : status === 'invalid' ? (
            <Outcome
              icon={<Lock size={40} aria-hidden="true" />}
              title={t('reset.invalidTitle')}
              body={t('reset.invalidBody')}
              action={
                <Link
                  to="/login"
                  state={{ view: 'forgot' }}
                  className={cn(PRIMARY_BUTTON_CLASS, 'font-sans no-underline')}
                >
                  {t('reset.requestNew')}
                </Link>
              }
            />
          ) : (
            <>
              <div className="mb-7 text-center">
                <h1 className={cn(TITLE_CLASS, 'font-sans')}>
                  {t('reset.title')}
                </h1>
                <p className="text-[13px] leading-[1.5] text-[var(--body)]">
                  {t('reset.description')}
                </p>
              </div>
              <form onSubmit={submit} noValidate className="font-sans">
                <Field id={`${id}-new`} label={t('changePassword.new')}>
                  <input
                    id={`${id}-new`}
                    type={type}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="new-password"
                    autoFocus
                    aria-invalid={tried && weak ? true : undefined}
                    aria-describedby={`${id}-rules`}
                    className={cn(
                      INPUT_CLASS,
                      tried && weak && INPUT_ERROR_CLASS
                    )}
                  />
                </Field>
                <ul
                  id={`${id}-rules`}
                  aria-label={t('changePassword.rulesLabel')}
                  className="mb-4 grid gap-1.5 text-[12.5px] sm:grid-cols-2"
                >
                  {rules.map((r) => (
                    <li
                      key={r.key}
                      className={cn(
                        'flex items-center gap-2',
                        r.met
                          ? 'text-white/90'
                          : tried
                            ? 'text-[var(--err)]'
                            : 'text-white/55'
                      )}
                    >
                      {r.met ? (
                        <CircleCheck size={14} aria-hidden="true" />
                      ) : (
                        <Circle size={14} aria-hidden="true" />
                      )}
                      {t(r.key)}
                      <span className="sr-only">
                        ,{' '}
                        {r.met
                          ? t('changePassword.met')
                          : t('changePassword.notMet')}
                      </span>
                    </li>
                  ))}
                </ul>
                <Field
                  id={`${id}-confirm`}
                  label={t('changePassword.confirm')}
                  error={
                    tried && mismatch ? t('changePassword.mismatch') : undefined
                  }
                >
                  <input
                    id={`${id}-confirm`}
                    type={type}
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    autoComplete="new-password"
                    aria-invalid={tried && mismatch ? true : undefined}
                    aria-describedby={
                      tried && mismatch ? `${id}-confirm-error` : undefined
                    }
                    className={cn(
                      INPUT_CLASS,
                      tried && mismatch && INPUT_ERROR_CLASS
                    )}
                  />
                </Field>
                <label className="mb-5 flex cursor-pointer items-center gap-2 text-[12.5px] text-white/65 select-none">
                  <input
                    type="checkbox"
                    checked={show}
                    onChange={(e) => setShow(e.target.checked)}
                    className="app-custom-checkbox"
                  />
                  {t('changePassword.showPasswords')}
                </label>
                <button
                  type="submit"
                  disabled={busy}
                  className={PRIMARY_BUTTON_CLASS}
                >
                  {busy ? t('reset.submitting') : t('reset.submit')}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </main>
  )
}

function Field({
  id,
  label,
  error,
  children,
}: {
  id: string
  label: string
  error?: string
  children: ReactNode
}) {
  return (
    <div className="mb-4 text-left">
      <label htmlFor={id} className={LABEL_CLASS}>
        {label}
      </label>
      <div className="relative flex items-center">
        {children}
        <Lock aria-hidden="true" size={20} className={FIELD_ICON_CLASS} />
      </div>
      {error && (
        <p id={`${id}-error`} className={ERROR_CLASS}>
          {error}
        </p>
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
