import { useId, useRef, useState, type FormEvent, type Ref } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { Link, useLocation } from 'react-router-dom'
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CircleAlert,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { mergeRefs } from '@/lib/merge-refs'
import { EmailSuggestion } from './EmailSuggestion'
import { GoogleIcon } from './GoogleIcon'
import { GoogleSignInButton } from './GoogleSignInButton'
import type { SignupRole } from '@/features/auth/utils/signupRole'
import {
  passwordRequirements,
  validateSignupIssues,
  type SignupField,
} from '@/features/auth/utils/accountValidation'
import { useMotion } from '@/components/ui/motion'
import {
  CARD_CLASS,
  FIELD_ICON_CLASS,
  FieldMessage,
  INPUT_CLASS,
  INPUT_ERROR_CLASS,
  LABEL_CLASS,
  LINK_CLASS,
  PRIMARY_BUTTON_CLASS,
  SECONDARY_BUTTON_CLASS,
} from './EmailLoginForm'

export type RegisterFormValues = {
  email: string
  password: string
}

export type RegisterFormProps = {
  /** Chosen in the first step; changes the heading and adds the expert note */
  role: SignupRole
  /** Values typed before going back to change the choice */
  initialValues?: RegisterFormValues | null
  /** Back to the first step, keeping what was typed */
  onChangeRole: (values: RegisterFormValues) => void
  onSubmit: (values: RegisterFormValues) => void
  /** Receives the Google ID token */
  onGoogle: (idToken: string) => void
  emailInputRef?: Ref<HTMLInputElement>
  isLoading?: boolean
  error?: string | null
}

const LEGAL_LINK_CLASS =
  'rounded-sm text-white/80 underline decoration-white/30 underline-offset-2 transition-colors hover:text-white hover:decoration-white/70'

const order: SignupField[] = ['email', 'password', 'terms']

/* Second sign-up step, the same for customers and experts: email, password and terms, or Google.
 * The name is filled in later (expert profile or account page); until then the server uses the email's
 * local part. The step before it picked the role. */
export function RegisterForm({
  role,
  initialValues,
  onChangeRole,
  onSubmit,
  onGoogle,
  emailInputRef,
  isLoading = false,
  error,
}: RegisterFormProps) {
  const { t } = useTranslation('auth')
  const motion = useMotion({ preset: 'reveal' })
  // Giữ trang cần quay lại (nếu có) khi chuyển qua lại giữa đăng nhập và đăng ký
  const returnState = useLocation().state

  const [values, setValues] = useState({
    email: initialValues?.email ?? '',
    password: initialValues?.password ?? '',
    terms: false,
  })
  const [errors, setErrors] = useState<ReturnType<typeof validateSignupIssues>>(
    {}
  )
  const [submitted, setSubmitted] = useState(false)
  const [showPw, setShowPw] = useState(false)
  const [pwFocused, setPwFocused] = useState(false)
  const [googleUnavailable, setGoogleUnavailable] = useState(false)

  const emailRef = useRef<HTMLInputElement>(null)
  const passwordRef = useRef<HTMLInputElement>(null)
  const termsRef = useRef<HTMLInputElement>(null)
  const id = useId()
  const fieldId = (field: SignupField) => `${id}-${field}`
  const errorId = (field: SignupField) => `${id}-${field}-error`
  const rulesId = `${id}-rules`

  const rules = passwordRequirements(values.password)
  // Chỉ hiện khi đang nhập mật khẩu; ô trống thì câu "Vui lòng nhập mật khẩu" là đủ
  const showRules = pwFocused || values.password.length > 0

  function change<K extends keyof typeof values>(
    field: K,
    value: (typeof values)[K]
  ) {
    setValues((prev) => ({ ...prev, [field]: value }))
    setErrors((prev) => ({ ...prev, [field]: undefined }))
  }

  // An empty field is only reported after the first submit; before that only the format is checked
  function blur(field: 'email') {
    if (!values[field].trim() && !submitted) return
    setErrors((prev) => ({
      ...prev,
      [field]: validateSignupIssues(values)[field],
    }))
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isLoading) return
    setSubmitted(true)
    const next = validateSignupIssues(values)
    setErrors(next)
    const first = order.find((field) => next[field])
    if (first) {
      const target = {
        email: emailRef,
        password: passwordRef,
        terms: termsRef,
      }[first]
      return target.current?.focus()
    }
    onSubmit({
      email: values.email.trim(),
      password: values.password,
    })
  }

  const describe = (field: SignupField, ...extra: (string | false)[]) =>
    [errors[field] && errorId(field), ...extra].filter(Boolean).join(' ') ||
    undefined

  return (
    <div ref={motion} className="relative z-2 w-full max-w-[440px]">
      {/* Tighter than the sign-in card so the whole form fits a laptop screen without scrolling */}
      <div className={cn(CARD_CLASS, 'pt-6 pb-6')}>
        <div className="relative mb-5 px-10 text-center">
          {/* Back returns to the role choice and keeps what was typed */}
          <button
            type="button"
            onClick={() =>
              onChangeRole({
                email: values.email,
                password: values.password,
              })
            }
            aria-label={t('actions.back')}
            title={t('actions.back')}
            className="motion-interactive absolute top-0 left-0 grid size-9 place-items-center rounded-lg text-white/55 hover:bg-white/8 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
          >
            <ArrowLeft aria-hidden="true" size={18} />
          </button>
          <h1 className="font-sans text-[22px] leading-[1.25] font-bold tracking-[-0.025em] text-white max-[420px]:text-[20px]">
            {t(role === 'expert' ? 'register.titleExpert' : 'register.title')}
          </h1>
          <p className="mt-1 text-[13px] leading-[1.45] text-[var(--body)]">
            {t(role === 'expert' ? 'register.expertIntro' : 'register.description')}
          </p>
        </div>

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
          <div className="mb-3">
            <label htmlFor={fieldId('email')} className={LABEL_CLASS}>
              {t('email.label')}
            </label>
            <div className="relative flex items-center">
              <input
                ref={mergeRefs(emailRef, emailInputRef)}
                id={fieldId('email')}
                name="email"
                type="email"
                inputMode="email"
                autoCapitalize="none"
                spellCheck={false}
                value={values.email}
                onChange={(e) => change('email', e.target.value)}
                onBlur={() => blur('email')}
                readOnly={isLoading}
                placeholder={t('email.placeholder')}
                autoComplete="email"
                aria-invalid={errors.email ? true : undefined}
                aria-describedby={describe('email')}
                className={cn(
                  INPUT_CLASS,
                  'font-sans',
                  errors.email && INPUT_ERROR_CLASS
                )}
              />
              <Mail aria-hidden="true" className={FIELD_ICON_CLASS} />
            </div>
            {errors.email && (
              <FieldMessage id={errorId('email')}>
                {t(`validation.${errors.email}`)}
              </FieldMessage>
            )}
            <EmailSuggestion
              email={values.email}
              onApply={(email) => change('email', email)}
            />
          </div>

          <div className="mb-3">
            <label htmlFor={fieldId('password')} className={LABEL_CLASS}>
              {t('password.label')}
            </label>
            <div className="relative flex items-center">
              <input
                ref={passwordRef}
                id={fieldId('password')}
                name="new-password"
                type={showPw ? 'text' : 'password'}
                value={values.password}
                onChange={(e) => change('password', e.target.value)}
                onFocus={() => setPwFocused(true)}
                onBlur={() => setPwFocused(false)}
                readOnly={isLoading}
                placeholder={t('register.passwordPlaceholder')}
                autoComplete="new-password"
                aria-invalid={errors.password ? true : undefined}
                aria-describedby={describe('password', showRules && rulesId)}
                className={cn(
                  INPUT_CLASS,
                  'pr-12 font-sans',
                  errors.password && INPUT_ERROR_CLASS
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
                aria-controls={fieldId('password')}
                className="motion-interactive absolute top-1/2 right-1.5 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-lg text-white/45 hover:bg-white/8 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-[var(--accent)]"
              >
                {showPw ? (
                  <EyeOff aria-hidden="true" size={18} />
                ) : (
                  <Eye aria-hidden="true" size={18} />
                )}
              </button>
            </div>
            {errors.password && (
              <FieldMessage id={errorId('password')}>
                {t(`validation.${errors.password}`)}
              </FieldMessage>
            )}
            {showRules && (
              <ul
                id={rulesId}
                aria-label={t('changePassword.rulesLabel')}
                className="mt-2.5 grid grid-cols-2 gap-x-3 gap-y-1 text-[12px] leading-[1.4] max-[420px]:grid-cols-1"
              >
                {rules.map((rule) => (
                  <li
                    key={rule.key}
                    className={cn(
                      'flex items-center gap-1.5 transition-colors',
                      rule.met ? 'text-white/80' : 'text-white/40'
                    )}
                  >
                    <span
                      aria-hidden="true"
                      className={cn(
                        'grid h-3.5 w-3.5 flex-none place-items-center rounded-full border transition-colors',
                        rule.met
                          ? 'border-[var(--link)] bg-[var(--link)] text-black'
                          : 'border-white/25'
                      )}
                    >
                      {rule.met && <Check size={10} strokeWidth={3.5} />}
                    </span>
                    <span>
                      {t(rule.key)}
                      <span className="sr-only">
                        {' '}
                        (
                        {t(
                          rule.met
                            ? 'changePassword.met'
                            : 'changePassword.notMet'
                        )}
                        )
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="mb-3.5">
            <div className="flex items-start">
              <input
                ref={termsRef}
                id={fieldId('terms')}
                type="checkbox"
                checked={values.terms}
                onChange={(e) => change('terms', e.target.checked)}
                aria-invalid={errors.terms ? true : undefined}
                aria-describedby={describe('terms')}
                className="app-custom-checkbox mt-[2px] flex-none"
              />
              <label
                htmlFor={fieldId('terms')}
                className="cursor-pointer pl-2.5 text-[12.5px] leading-[1.5] text-white/65 select-none"
              >
                <Trans
                  ns="auth"
                  i18nKey="register.terms"
                  components={{
                    terms: <a href="/terms" target="_blank" rel="noopener noreferrer" className={LEGAL_LINK_CLASS} />,
                    privacy: <a href="/privacy" target="_blank" rel="noopener noreferrer" className={LEGAL_LINK_CLASS} />,
                  }}
                />
              </label>
            </div>
            {errors.terms && (
              <FieldMessage id={errorId('terms')}>
                {t(`validation.${errors.terms}`)}
              </FieldMessage>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading}
            aria-busy={isLoading}
            className={cn(PRIMARY_BUTTON_CLASS, 'font-sans')}
          >
            {isLoading ? (
              <>
                <Loader2
                  aria-hidden="true"
                  size={18}
                  className="animate-spin motion-reduce:animate-none"
                />
                <span>{t('register.submitting')}</span>
              </>
            ) : (
              <>
                <span>{t('register.submit')}</span>
                <ArrowRight aria-hidden="true" size={18} />
              </>
            )}
          </button>
          <span role="status" className="sr-only">
            {isLoading ? t('register.submitting') : ''}
          </span>
        </form>

        <div className="my-3 flex items-center gap-4 text-[11.5px] font-medium tracking-[0.08em] text-white/35 uppercase">
          <span aria-hidden="true" className="h-px flex-1 bg-white/10" />
          {t('register.continueWith')}
          <span aria-hidden="true" className="h-px flex-1 bg-white/10" />
        </div>
        <GoogleSignInButton onCredential={onGoogle} disabled={isLoading}>
          <button
            type="button"
            onClick={() => setGoogleUnavailable(true)}
            disabled={isLoading}
            className={cn(SECONDARY_BUTTON_CLASS, 'font-sans')}
          >
            <GoogleIcon size={18} />
            <span>{t('actions.google')}</span>
          </button>
        </GoogleSignInButton>
        {googleUnavailable && (
          <p role="status" className="mt-3 text-center text-[12.5px] leading-[1.5] text-white/65">
            {t('googleUnavailable')}
          </p>
        )}

        <p className="mt-3 text-center text-[13px] leading-[1.6] text-white/55">
          {t('register.haveAccount')}{' '}
          <Link to="/login" state={returnState} className={LINK_CLASS}>
            {t('register.signIn')}
          </Link>
        </p>
      </div>
    </div>
  )
}

export default RegisterForm
