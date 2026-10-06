import { useTranslation } from 'react-i18next'
import {
  useId,
  useState,
  type ChangeEvent,
  type FormEvent,
  type Ref,
} from 'react'
import { ArrowRight, Lock, Mail } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  isValidEmail,
  validateLogin,
  type LoginFormValues,
  type LoginFormErrors,
} from '@/utils/validators'
import { GoogleIcon } from './GoogleIcon'
import { BackButton } from './BackButton'
import { useMotion } from '@/components/ui/motion'

export type EmailLoginFormProps = {
  onBack: () => void
  onGoogle: () => void
  onSubmit: (data: LoginFormValues) => void
  className?: string
  emailInputRef?: Ref<HTMLInputElement>
  isLoading?: boolean
  error?: string | null
}

const UI_FONT = "font-sans"


const LABEL_CLASS = cn(
  'block text-[12px] font-semibold tracking-[-0.01em] text-white/85 mb-[7px]',
  UI_FONT
)

const INPUT_CLASS =
  'peer w-full h-[50px] pl-11 pr-[14px] rounded-xl border border-white/14 bg-white/5 text-sm font-medium text-white outline-none backdrop-blur-[10px] [-webkit-backdrop-filter:blur(10px)] placeholder:text-white/35 motion-interactive focus:border-[var(--accent)] focus:bg-white/8 focus:ring-2 focus:ring-accent/25'

const INPUT_ERROR_CLASS =
  'border-[var(--err)] ring-2 ring-[var(--err)]/20'

const FIELD_ICON_CLASS =
  'pointer-events-none absolute left-[14px] text-white/40 transition-colors peer-focus:text-[var(--accent)]'

const ERROR_CLASS = 'mt-1.5 text-[12px] leading-[1.4] text-[var(--err)]'

const LINK_CLASS =
  'text-[var(--link)] font-medium no-underline underline-offset-2 transition-opacity hover:underline hover:opacity-80'

export function EmailLoginForm({
  onBack,
  onGoogle,
  onSubmit,
  className,
  emailInputRef,
  isLoading = false,
  error,
}: EmailLoginFormProps) {
  const motion = useMotion({ preset: 'panel' })
  const { t } = useTranslation('auth')

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [emailError, setEmailError] =
    useState<LoginFormErrors['email']>(undefined)
  const [pwError, setPwError] = useState<LoginFormErrors['password']>(undefined)
  const [touchedEmail, setTouchedEmail] = useState(false)
  const [touchedPw, setTouchedPw] = useState(false)

  const emailId = useId()
  const pwId = useId()
  const emailErrId = `${emailId}-error`
  const pwErrId = `${pwId}-error`

  function handleEmailChange(event: ChangeEvent<HTMLInputElement>) {
    setEmail(event.target.value)
    setEmailError(undefined)
  }

  function handlePasswordChange(event: ChangeEvent<HTMLInputElement>) {
    setPassword(event.target.value)
    setPwError(undefined)
  }

  function handleEmailBlur() {
    setTouchedEmail(true)
    setEmailError(
      isValidEmail(email) ? undefined : validateLogin({ email, password }).email
    )
  }

  function handlePasswordBlur() {
    setTouchedPw(true)
    setPwError(validateLogin({ email, password }).password)
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isLoading) return
    setTouchedEmail(true)
    setTouchedPw(true)
    const errors = validateLogin({ email, password })
    setEmailError(errors.email)
    setPwError(errors.password)
    if (errors.email || errors.password) return
    onSubmit({ email: email.trim(), password })
  }

  return (
    <div
      ref={motion}
      className={cn(
        'relative z-2 w-full max-w-[440px]',
        className
      )}
    >
      <div className="glass-card-fallback relative w-full rounded-3xl border border-white/14 bg-[color-mix(in_srgb,var(--ui-login-canvas)_42.0%,transparent)] px-8 pt-9 pb-8 shadow-[0_24px_60px_-20px_color-mix(in_srgb,var(--ui-overlay-ink)_55.0%,transparent),0_4px_12px_color-mix(in_srgb,var(--ui-overlay-ink)_25.0%,transparent),inset_0_1px_0_color-mix(in_srgb,var(--ui-login-text)_10.0%,transparent)] backdrop-blur-[28px] backdrop-saturate-150 [-webkit-backdrop-filter:blur(28px)_saturate(1.5)] max-[420px]:rounded-[20px] max-[420px]:px-[22px] max-[420px]:pt-8 max-[420px]:pb-[26px]">
        <BackButton onClick={onBack} />

        <div className="mb-7 text-center">
          <div
            className={cn(
              'mb-1.5 text-[22px] leading-[1.2] font-bold tracking-[-0.02em] text-white max-[420px]:text-[20px]',
              UI_FONT
            )}
          >
            {t('email.title')}
          </div>
          <div className="text-[13px] leading-[1.5] text-[var(--body)]">
            {t('email.description')}
          </div>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div className="mb-4 text-left">
            <label htmlFor={emailId} className={LABEL_CLASS}>
              {t('email.label')}
            </label>
            <div className="relative flex items-center">
              <input
                ref={emailInputRef}
                id={emailId}
                type="email"
                value={email}
                onChange={handleEmailChange}
                onBlur={handleEmailBlur}
                placeholder={t('email.placeholder')}
                autoComplete="email"
                aria-invalid={emailError ? true : undefined}
                aria-describedby={emailError ? emailErrId : undefined}
                className={cn(
                  INPUT_CLASS,
                  UI_FONT,
                  emailError ? INPUT_ERROR_CLASS : undefined
                )}
              />
              <Mail aria-hidden="true" size={20} className={FIELD_ICON_CLASS} />
            </div>
            {touchedEmail && emailError ? (
              <p id={emailErrId} className={ERROR_CLASS}>
                {t(emailError)}
              </p>
            ) : null}
          </div>

          <div className="mb-4 text-left">
            <label htmlFor={pwId} className={LABEL_CLASS}>
              {t('password.label')}
            </label>
            <div className="relative flex items-center">
              <input
                id={pwId}
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={handlePasswordChange}
                onBlur={handlePasswordBlur}
                placeholder={t('password.placeholder')}
                autoComplete="current-password"
                aria-invalid={pwError ? true : undefined}
                aria-describedby={pwError ? pwErrId : undefined}
                className={cn(
                  INPUT_CLASS,
                  UI_FONT,
                  'pr-[70px]',
                  pwError ? INPUT_ERROR_CLASS : undefined
                )}
              />
              <Lock aria-hidden="true" size={20} className={FIELD_ICON_CLASS} />
              <button
                type="button"
                onClick={() => setShowPw((prev) => !prev)}
                className={cn(
                  'absolute top-1/2 right-1.5 h-[38px] -translate-y-1/2 rounded-lg border-0 bg-transparent px-3 text-[12px] font-semibold text-white/55 motion-interactive hover:bg-white/6 hover:text-white',
                  UI_FONT
                )}
              >
                {showPw ? t('password.hide') : t('password.show')}
              </button>
            </div>
            {touchedPw && pwError ? (
              <p id={pwErrId} className={ERROR_CLASS}>
                {t(pwError)}
              </p>
            ) : null}
          </div>

          <div className="mt-1 mb-5 flex items-center justify-between text-[12.5px]">
            <label className="flex cursor-pointer items-center gap-2 text-white/65 select-none">
              <input
                type="checkbox"
                defaultChecked
                className="h-[15px] w-[15px] cursor-pointer accent-[var(--accent)]"
              />
              <span>{t('email.remember')}</span>
            </label>
            <a href="#" className={LINK_CLASS}>
              {t('email.forgot')}
            </a>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className={cn(
              'flex h-[50px] w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-[var(--accent)] text-[15px] font-bold text-white shadow-accent motion-interactive hover:-translate-y-px hover:bg-accent-hover hover:shadow-accent active:translate-y-0 active:scale-[.995] disabled:pointer-events-none disabled:opacity-60',
              UI_FONT
            )}
          >
            <span>{t('actions.signIn')}</span>
            <ArrowRight aria-hidden="true" size={18} />
          </button>
        </form>
        {isLoading && (
          <p role="status" className="mt-3 text-center text-sm text-white">
            {t('actions.signingIn')}
          </p>
        )}
        {error && (
          <p role="alert" className="mt-3 text-sm text-[var(--err)]">
            {error}
          </p>
        )}

        <div className="mt-[22px] mb-[18px] flex items-center gap-[14px] text-[12px] text-white/35">
          <span aria-hidden="true" className="h-px flex-1 bg-white/10" />
          {t('actions.or')}
          <span aria-hidden="true" className="h-px flex-1 bg-white/10" />
        </div>

        <button
          type="button"
          onClick={onGoogle}
          className={cn(
            'flex min-h-[50px] w-full cursor-pointer items-center justify-center gap-[10px] rounded-xl border border-white/14 bg-white/5 text-sm font-medium text-white backdrop-blur-[10px] [-webkit-backdrop-filter:blur(10px)] motion-interactive hover:border-white/22 hover:bg-white/10 active:scale-[.995]',
            UI_FONT
          )}
        >
          <GoogleIcon size={18} />
          <span>{t('actions.google')}</span>
        </button>

        <div className="mt-[22px] text-center text-[12.5px] leading-[1.6] text-white/50">
          {t('email.noAccount')}{' '}
          <a href="#" className={LINK_CLASS}>
            {t('email.create')}
          </a>
        </div>
      </div>
    </div>
  )
}

export default EmailLoginForm
