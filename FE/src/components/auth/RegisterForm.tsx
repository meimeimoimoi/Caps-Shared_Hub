import { useId, useRef, useState, type FormEvent, type Ref } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { Link, useLocation } from 'react-router-dom'
import {
  ArrowRight,
  Check,
  CircleAlert,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  UserRound,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { mergeRefs } from '@/lib/merge-refs'
import { AuthBrandHeader } from './AuthBrandHeader'
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
} from './EmailLoginForm'

export type RegisterFormValues = {
  name: string
  email: string
  password: string
}

export type RegisterFormProps = {
  onSubmit: (values: RegisterFormValues) => void
  nameInputRef?: Ref<HTMLInputElement>
  isLoading?: boolean
  error?: string | null
}

const LEGAL_LINK_CLASS =
  'rounded-sm text-white/80 underline decoration-white/30 underline-offset-2 transition-colors hover:text-white hover:decoration-white/70'

const order: SignupField[] = ['name', 'email', 'password', 'terms']

/* Đăng ký khách hàng: chỉ họ tên, email, mật khẩu và đồng ý điều khoản.
 * Chuyên gia có luồng riêng nhiều bước ở /expert/register. */
export function RegisterForm({
  onSubmit,
  nameInputRef,
  isLoading = false,
  error,
}: RegisterFormProps) {
  const { t } = useTranslation('auth')
  const motion = useMotion({ preset: 'reveal' })
  // Giữ trang cần quay lại (nếu có) khi chuyển qua lại giữa đăng nhập và đăng ký
  const returnState = useLocation().state

  const [values, setValues] = useState({
    name: '',
    email: '',
    password: '',
    terms: false,
  })
  const [errors, setErrors] = useState<ReturnType<typeof validateSignupIssues>>(
    {}
  )
  const [submitted, setSubmitted] = useState(false)
  const [showPw, setShowPw] = useState(false)
  const [pwFocused, setPwFocused] = useState(false)

  const nameRef = useRef<HTMLInputElement>(null)
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

  // Ô trống chỉ báo lỗi sau lần bấm tạo tài khoản đầu tiên; trước đó chỉ bắt sai định dạng
  function blur(field: 'name' | 'email') {
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
        name: nameRef,
        email: emailRef,
        password: passwordRef,
        terms: termsRef,
      }[first]
      return target.current?.focus()
    }
    onSubmit({
      name: values.name.trim(),
      email: values.email.trim(),
      password: values.password,
    })
  }

  const describe = (field: SignupField, ...extra: (string | false)[]) =>
    [errors[field] && errorId(field), ...extra].filter(Boolean).join(' ') ||
    undefined

  return (
    <div ref={motion} className="relative z-2 w-full max-w-[440px]">
      <div className={CARD_CLASS}>
        <AuthBrandHeader title={t('register.title')} />

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
            <label htmlFor={fieldId('name')} className={LABEL_CLASS}>
              {t('register.nameLabel')}
            </label>
            <div className="relative flex items-center">
              <input
                ref={mergeRefs(nameRef, nameInputRef)}
                id={fieldId('name')}
                name="name"
                value={values.name}
                onChange={(e) => change('name', e.target.value)}
                onBlur={() => blur('name')}
                readOnly={isLoading}
                placeholder={t('register.namePlaceholder')}
                autoComplete="name"
                aria-invalid={errors.name ? true : undefined}
                aria-describedby={describe('name')}
                className={cn(
                  INPUT_CLASS,
                  'font-sans',
                  errors.name && INPUT_ERROR_CLASS
                )}
              />
              <UserRound aria-hidden="true" className={FIELD_ICON_CLASS} />
            </div>
            {errors.name && (
              <FieldMessage id={errorId('name')}>
                {t(`validation.${errors.name}`)}
              </FieldMessage>
            )}
          </div>

          <div className="mb-4">
            <label htmlFor={fieldId('email')} className={LABEL_CLASS}>
              {t('email.label')}
            </label>
            <div className="relative flex items-center">
              <input
                ref={emailRef}
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
          </div>

          <div className="mb-4">
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

          <div className="mb-5">
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
                    terms: <a href="#" className={LEGAL_LINK_CLASS} />,
                    privacy: <a href="#" className={LEGAL_LINK_CLASS} />,
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

        <p className="mt-5 text-center text-[13px] leading-[1.6] text-white/55">
          {t('register.haveAccount')}{' '}
          <Link to="/login" state={returnState} className={LINK_CLASS}>
            {t('register.signIn')}
          </Link>
        </p>

        <p className="mt-1.5 text-center text-[12.5px] leading-[1.6] text-white/45">
          {t('register.expertPrompt')}{' '}
          <Link to="/expert/register" className={LINK_CLASS}>
            {t('register.expertLink')}
          </Link>
        </p>
      </div>
    </div>
  )
}

export default RegisterForm
