import { useTranslation } from 'react-i18next'
import {
  useId,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
  type KeyboardEvent,
  type ReactNode,
  type Ref,
} from 'react'
import {
  ArrowRight,
  CircleAlert,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  ArrowBigUp,
} from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { mergeRefs } from '@/lib/merge-refs'
import { validateLogin, type LoginFormErrors } from '@/utils/validators'
import type { LoginFormValues } from '@/features/auth/types'
import { GoogleIcon } from './GoogleIcon'
import { AuthCardHeader } from './AuthCardHeader'
import { useMotion } from '@/components/ui/motion'

export type EmailLoginFormProps = {
  onBack: () => void
  onGoogle: () => void
  onForgot: () => void
  onSubmit: (data: LoginFormValues) => void
  className?: string
  emailInputRef?: Ref<HTMLInputElement>
  isLoading?: boolean
  error?: string | null
}

const UI_FONT = 'font-sans'

export const LABEL_CLASS =
  'block text-[13px] font-semibold tracking-[-0.01em] text-white/90 mb-1.5 font-sans'

export const INPUT_CLASS =
  'peer w-full h-11 pl-11 pr-[14px] rounded-xl border border-white/12 bg-white/[0.04] text-[14.5px] font-medium text-white outline-none backdrop-blur-[10px] [-webkit-backdrop-filter:blur(10px)] placeholder:font-normal placeholder:text-white/30 motion-interactive hover:border-white/20 focus:border-white/35 focus:bg-white/[0.06] read-only:opacity-70'

export const INPUT_ERROR_CLASS =
  'border-[var(--err)]/70 bg-[var(--err)]/[0.05] hover:border-[var(--err)] focus:border-[var(--err)]'

export const FIELD_ICON_CLASS =
  'pointer-events-none absolute left-[14px] h-[18px] w-[18px] text-white/35 transition-colors peer-focus:text-white/70'

export const ERROR_CLASS =
  'mt-2 flex items-start gap-1.5 text-[12.5px] leading-[1.45] text-[var(--err)]'

export const LINK_CLASS =
  'rounded-sm text-[var(--link)] font-medium no-underline underline-offset-[3px] transition-opacity hover:underline hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--link)]'

export const CARD_CLASS =
  'glass-card-fallback relative w-full rounded-3xl border border-white/12 bg-[color-mix(in_srgb,var(--ui-login-canvas)_55.0%,transparent)] px-8 pt-7 pb-7 shadow-[0_32px_80px_-24px_color-mix(in_srgb,var(--ui-overlay-ink)_70.0%,transparent),0_4px_12px_color-mix(in_srgb,var(--ui-overlay-ink)_25.0%,transparent),inset_0_1px_0_color-mix(in_srgb,var(--ui-login-text)_10.0%,transparent)] backdrop-blur-[28px] backdrop-saturate-150 [-webkit-backdrop-filter:blur(28px)_saturate(1.5)] max-[420px]:rounded-[20px] max-[420px]:px-[22px] max-[420px]:pt-6 max-[420px]:pb-6'

export const TITLE_CLASS =
  'mb-1.5 text-[22px] leading-[1.2] font-bold tracking-[-0.02em] text-white max-[420px]:text-[20px]'

export const PRIMARY_BUTTON_CLASS =
  'flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-[var(--accent)] text-[15px] font-semibold text-white shadow-accent motion-interactive hover:-translate-y-px hover:bg-accent-hover active:translate-y-0 active:scale-[.995] focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-[var(--accent)] disabled:pointer-events-none disabled:opacity-60 aria-busy:opacity-90'

export const SECONDARY_BUTTON_CLASS =
  'motion-interactive flex h-11 w-full cursor-pointer items-center justify-center gap-[10px] rounded-xl border border-white/12 bg-white/[0.04] text-[14.5px] font-medium text-white hover:border-white/22 hover:bg-white/[0.09] focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-[var(--accent)] active:scale-[.995] disabled:pointer-events-none disabled:opacity-60'

export function FieldMessage({ id, children }: { id?: string; children: ReactNode }) {
  return (
    <p id={id} className={ERROR_CLASS}>
      <CircleAlert aria-hidden="true" size={14} className="mt-[2px] flex-none" />
      <span>{children}</span>
    </p>
  )
}

export function EmailLoginForm({
  onBack,
  onGoogle,
  onForgot,
  onSubmit,
  className,
  emailInputRef,
  isLoading = false,
  error,
}: EmailLoginFormProps) {
  const motion = useMotion({ preset: 'panel' })
  const { t } = useTranslation('auth')
  const returnState = useLocation().state

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(true)
  const [showPw, setShowPw] = useState(false)
  const [capsLock, setCapsLock] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [emailError, setEmailError] =
    useState<LoginFormErrors['email']>(undefined)
  const [pwError, setPwError] = useState<LoginFormErrors['password']>(undefined)

  const emailRef = useRef<HTMLInputElement>(null)
  const pwRef = useRef<HTMLInputElement>(null)

  const emailId = useId()
  const pwId = useId()
  const rememberId = useId()
  const emailErrId = `${emailId}-error`
  const pwErrId = `${pwId}-error`
  const capsId = `${pwId}-caps`

  function handleEmailChange(event: ChangeEvent<HTMLInputElement>) {
    setEmail(event.target.value)
    setEmailError(undefined)
  }

  function handlePasswordChange(event: ChangeEvent<HTMLInputElement>) {
    setPassword(event.target.value)
    setPwError(undefined)
  }

  // Ô trống chỉ báo lỗi sau lần bấm đăng nhập đầu tiên; trước đó chỉ bắt sai định dạng
  function handleEmailBlur() {
    if (!email.trim() && !submitted) return
    setEmailError(validateLogin({ email, password }).email)
  }

  function handlePasswordBlur() {
    setCapsLock(false)
    if (submitted) setPwError(validateLogin({ email, password }).password)
  }

  function handlePasswordKey(event: KeyboardEvent<HTMLInputElement>) {
    setCapsLock(event.getModifierState('CapsLock'))
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isLoading) return
    setSubmitted(true)
    const errors = validateLogin({ email, password })
    setEmailError(errors.email)
    setPwError(errors.password)
    if (errors.email) return emailRef.current?.focus()
    if (errors.password) return pwRef.current?.focus()
    onSubmit({ email: email.trim(), password, rememberMe })
  }

  const pwDescribedBy =
    [pwError && pwErrId, capsLock && capsId].filter(Boolean).join(' ') ||
    undefined

  return (
    <div
      ref={motion}
      className={cn('relative z-2 w-full max-w-[440px]', className)}
    >
      <div className={CARD_CLASS}>
        <AuthCardHeader
          title={t('email.title')}
          description={t('email.description')}
          onBack={onBack}
        />

        {error && !isLoading && (
          <div
            role="alert"
            className="mb-4 flex items-start gap-2.5 rounded-xl border border-[var(--err)]/30 bg-[var(--err)]/10 px-3.5 py-3 text-[13px] leading-[1.5] text-white/90"
          >
            <CircleAlert
              aria-hidden="true"
              size={16}
              className="mt-[2px] flex-none text-[var(--err)]"
            />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate aria-busy={isLoading}>
          <div className="mb-4">
            <label htmlFor={emailId} className={LABEL_CLASS}>
              {t('email.label')}
            </label>
            <div className="relative flex items-center">
              <input
                ref={mergeRefs(emailRef, emailInputRef)}
                id={emailId}
                name="email"
                type="email"
                inputMode="email"
                autoCapitalize="none"
                spellCheck={false}
                value={email}
                onChange={handleEmailChange}
                onBlur={handleEmailBlur}
                readOnly={isLoading}
                placeholder={t('email.placeholder')}
                autoComplete="username email"
                aria-invalid={emailError ? true : undefined}
                aria-describedby={emailError ? emailErrId : undefined}
                className={cn(
                  INPUT_CLASS,
                  UI_FONT,
                  emailError ? INPUT_ERROR_CLASS : undefined
                )}
              />
              <Mail aria-hidden="true" className={FIELD_ICON_CLASS} />
            </div>
            {emailError ? (
              <FieldMessage id={emailErrId}>{t(emailError)}</FieldMessage>
            ) : null}
          </div>

          <div className="mb-4">
            <div className="mb-1.5 flex items-baseline justify-between gap-3">
              <label htmlFor={pwId} className={cn(LABEL_CLASS, 'mb-0')}>
                {t('password.label')}
              </label>
              <button
                type="button"
                onClick={onForgot}
                className={cn(LINK_CLASS, 'text-[12.5px]')}
              >
                {t('email.forgot')}
              </button>
            </div>
            <div className="relative flex items-center">
              <input
                ref={pwRef}
                id={pwId}
                name="password"
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={handlePasswordChange}
                onBlur={handlePasswordBlur}
                onKeyDown={handlePasswordKey}
                onKeyUp={handlePasswordKey}
                readOnly={isLoading}
                placeholder={t('password.placeholder')}
                autoComplete="current-password"
                aria-invalid={pwError ? true : undefined}
                aria-describedby={pwDescribedBy}
                className={cn(
                  INPUT_CLASS,
                  UI_FONT,
                  'pr-12',
                  pwError ? INPUT_ERROR_CLASS : undefined
                )}
              />
              <Lock aria-hidden="true" className={FIELD_ICON_CLASS} />
              <button
                type="button"
                onClick={() => setShowPw((prev) => !prev)}
                aria-label={
                  showPw ? t('password.hideLabel') : t('password.showLabel')
                }
                aria-pressed={showPw}
                aria-controls={pwId}
                className="motion-interactive absolute top-1/2 right-1.5 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-lg text-white/45 hover:bg-white/8 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-[var(--accent)]"
              >
                {showPw ? (
                  <EyeOff aria-hidden="true" size={18} />
                ) : (
                  <Eye aria-hidden="true" size={18} />
                )}
              </button>
            </div>
            {pwError ? (
              <FieldMessage id={pwErrId}>{t(pwError)}</FieldMessage>
            ) : null}
            {capsLock ? (
              <p
                id={capsId}
                className="mt-2 flex items-center gap-1.5 text-[12.5px] leading-[1.45] text-amber-300/90"
              >
                <ArrowBigUp aria-hidden="true" size={14} className="flex-none" />
                <span>{t('password.capsLock')}</span>
              </p>
            ) : null}
          </div>

          <div className="mb-5 flex items-center">
            <input
              id={rememberId}
              type="checkbox"
              checked={rememberMe}
              onChange={(event) => setRememberMe(event.target.checked)}
              className="app-custom-checkbox"
            />
            <label
              htmlFor={rememberId}
              className="cursor-pointer pl-2.5 text-[13px] text-white/70 select-none hover:text-white/90"
            >
              {t('email.remember')}
            </label>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            aria-busy={isLoading}
            className={cn(PRIMARY_BUTTON_CLASS, UI_FONT)}
          >
            {isLoading ? (
              <>
                <Loader2
                  aria-hidden="true"
                  size={18}
                  className="animate-spin motion-reduce:animate-none"
                />
                <span>{t('actions.signingIn')}</span>
              </>
            ) : (
              <>
                <span>{t('actions.signIn')}</span>
                <ArrowRight aria-hidden="true" size={18} />
              </>
            )}
          </button>
          <span role="status" className="sr-only">
            {isLoading ? t('actions.signingIn') : ''}
          </span>
        </form>

        <div className="my-5 flex items-center gap-4 text-[11.5px] font-medium tracking-[0.08em] text-white/35 uppercase">
          <span aria-hidden="true" className="h-px flex-1 bg-white/10" />
          {t('actions.or')}
          <span aria-hidden="true" className="h-px flex-1 bg-white/10" />
        </div>

        <button
          type="button"
          onClick={onGoogle}
          disabled={isLoading}
          className={cn(
            SECONDARY_BUTTON_CLASS,
            UI_FONT
          )}
        >
          <GoogleIcon size={18} />
          <span>{t('actions.google')}</span>
        </button>

        <p className="mt-5 text-center text-[13px] leading-[1.6] text-white/55">
          {t('email.noAccount')}{' '}
          <Link to="/register" state={returnState} className={LINK_CLASS}>
            {t('email.create')}
          </Link>
        </p>
      </div>
    </div>
  )
}

export default EmailLoginForm
