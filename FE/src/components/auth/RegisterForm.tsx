import { useId, useState, type ChangeEvent, type FormEvent } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { ArrowRight, Check, Circle, Eye, EyeOff, Lock, Mail, User } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useMotion } from '@/components/ui/motion'
import { passwordRequirements } from '@/features/auth/utils/accountValidation'
import {
  validateRegister,
  type RegisterField,
} from '@/features/auth/utils/registerValidation'
import type { RegisterFormValues } from '@/features/auth/types'
import {
  CARD_CLASS,
  ERROR_CLASS,
  FIELD_ICON_CLASS,
  INPUT_CLASS,
  INPUT_ERROR_CLASS,
  LABEL_CLASS,
  LINK_CLASS,
  PRIMARY_BUTTON_CLASS,
  TITLE_CLASS,
} from './EmailLoginForm'
import { BackButton } from './BackButton'

export type RegisterFormProps = {
  onBack: () => void
  onSubmit: (data: RegisterFormValues) => void
  isLoading?: boolean
  error?: string | null
}

const EMPTY_VALUES: RegisterFormValues = {
  name: '',
  email: '',
  password: '',
  confirmPassword: '',
  terms: false,
}

const TEXT_FIELDS = [
  {
    key: 'name',
    label: 'register.name',
    placeholder: 'register.namePlaceholder',
    icon: User,
    type: 'text',
    autoComplete: 'name',
  },
  {
    key: 'email',
    label: 'register.email',
    placeholder: 'email.placeholder',
    icon: Mail,
    type: 'email',
    autoComplete: 'email',
  },
] as const

export function RegisterForm({
  onBack,
  onSubmit,
  isLoading = false,
  error,
}: RegisterFormProps) {
  const motion = useMotion({ preset: 'panel' })
  const { t } = useTranslation('auth')
  const uid = useId()
  const [values, setValues] = useState<RegisterFormValues>(EMPTY_VALUES)
  const [touched, setTouched] = useState<Partial<Record<RegisterField, boolean>>>({})
  const [attempted, setAttempted] = useState(false)
  const [showPw, setShowPw] = useState(false)

  const errors = validateRegister(values)
  const requirements = passwordRequirements(values.password)
  const showError = (field: RegisterField) =>
    (attempted || touched[field]) && errors[field]
      ? t(errors[field]!)
      : undefined

  const setText =
    (field: 'name' | 'email' | 'password' | 'confirmPassword') =>
    (e: ChangeEvent<HTMLInputElement>) =>
      setValues((v) => ({ ...v, [field]: e.target.value }))
  const touch = (field: RegisterField) =>
    setTouched((current) => ({ ...current, [field]: true }))

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (isLoading) return
    setAttempted(true)
    if (Object.keys(errors).length) return
    onSubmit({ ...values, name: values.name.trim(), email: values.email.trim() })
  }

  const fieldId = (key: string) => `${uid}-${key}`
  const passwordError = showError('password')
  const confirmError = showError('confirmPassword')

  return (
    <div ref={motion} className="relative z-2 w-full max-w-[440px]">
      <form className={CARD_CLASS} noValidate onSubmit={handleSubmit}>
        <BackButton onClick={onBack} ariaLabel={t('actions.back')} />

        <div className="mb-6 text-center">
          <div className={cn(TITLE_CLASS, 'font-sans')}>{t('register.title')}</div>
          <div className="text-[13px] leading-[1.5] text-[var(--body)]">
            {t('register.description')}
          </div>
        </div>

        {TEXT_FIELDS.map(({ key, label, placeholder, icon: Icon, type, autoComplete }) => {
          const id = fieldId(key)
          const err = showError(key)
          return (
            <div key={key} className="mb-4 text-left">
              <label htmlFor={id} className={LABEL_CLASS}>
                {t(label)}
              </label>
              <div className="relative flex items-center">
                <input
                  id={id}
                  name={key}
                  type={type}
                  autoComplete={autoComplete}
                  value={values[key]}
                  onChange={setText(key)}
                  onBlur={() => touch(key)}
                  placeholder={t(placeholder)}
                  aria-invalid={err ? true : undefined}
                  aria-describedby={err ? `${id}-error` : undefined}
                  className={cn(INPUT_CLASS, 'font-sans', err && INPUT_ERROR_CLASS)}
                />
                <Icon aria-hidden="true" size={20} className={FIELD_ICON_CLASS} />
              </div>
              {err && (
                <p id={`${id}-error`} className={ERROR_CLASS}>
                  {err}
                </p>
              )}
            </div>
          )
        })}

        {(['password', 'confirmPassword'] as const).map((key) => {
          const id = fieldId(key)
          const err = key === 'password' ? passwordError : confirmError
          return (
            <div key={key} className="mb-4 text-left">
              <label htmlFor={id} className={LABEL_CLASS}>
                {t(key === 'password' ? 'register.password' : 'register.confirm')}
              </label>
              <div className="relative flex items-center">
                <input
                  id={id}
                  name={key}
                  type={showPw ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={values[key]}
                  onChange={setText(key)}
                  onBlur={() => touch(key)}
                  placeholder={t('password.placeholder')}
                  aria-invalid={err ? true : undefined}
                  aria-describedby={err ? `${id}-error` : undefined}
                  className={cn(
                    INPUT_CLASS,
                    'font-sans',
                    key === 'password' && 'pr-[70px]',
                    err && INPUT_ERROR_CLASS
                  )}
                />
                <Lock aria-hidden="true" size={20} className={FIELD_ICON_CLASS} />
                {key === 'password' && (
                  <button
                    type="button"
                    onClick={() => setShowPw((prev) => !prev)}
                    aria-label={showPw ? t('password.hide') : t('password.show')}
                    className="motion-interactive absolute top-1/2 right-1.5 grid h-[38px] -translate-y-1/2 place-items-center rounded-lg border-0 bg-transparent px-3 text-white/55 hover:bg-white/6 hover:text-white"
                  >
                    {showPw ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
                  </button>
                )}
              </div>
              {err && (
                <p id={`${id}-error`} className={ERROR_CLASS}>
                  {err}
                </p>
              )}
            </div>
          )
        })}

        <ul aria-label={t('register.rulesLabel')} className="mb-5 grid gap-1.5 text-[12.5px]">
          {requirements.map((rule) => (
            <li
              key={rule.key}
              data-met={rule.met}
              className={cn(
                'flex items-center gap-2',
                rule.met ? 'text-white' : 'text-white/50'
              )}
            >
              {rule.met ? (
                <Check size={15} aria-hidden="true" />
              ) : (
                <Circle size={15} aria-hidden="true" />
              )}
              <span>
                <span className="sr-only">
                  {rule.met ? t('changePassword.met') : t('changePassword.notMet')}
                </span>
                {t(rule.key)}
              </span>
            </li>
          ))}
        </ul>

        <div className="mb-5">
          <label className="flex cursor-pointer items-start gap-2.5 text-[12.5px] leading-[1.6] text-white/65 select-none">
            <input
              type="checkbox"
              name="terms"
              checked={values.terms}
              onChange={(e) => setValues((v) => ({ ...v, terms: e.target.checked }))}
              onBlur={() => touch('terms')}
              aria-invalid={attempted && errors.terms ? true : undefined}
              className="app-custom-checkbox mt-0.5"
            />
            <span>
              <Trans
                ns="auth"
                i18nKey="register.terms"
                components={{
                  terms: <span className="font-medium text-[var(--link)]" />,
                  privacy: <span className="font-medium text-[var(--link)]" />,
                }}
              />
            </span>
          </label>
          {attempted && errors.terms && (
            <p className={ERROR_CLASS}>{t(errors.terms)}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className={cn(PRIMARY_BUTTON_CLASS, 'font-sans')}
        >
          <span>{isLoading ? t('register.submitting') : t('register.submit')}</span>
          <ArrowRight aria-hidden="true" size={18} />
        </button>

        {error && (
          <p role="alert" className="mt-3 text-center text-sm text-[var(--err)]">
            {error}
          </p>
        )}

        <div className="mt-[22px] text-center text-[12.5px] leading-[1.6] text-white/50">
          {t('register.haveAccount')}{' '}
          <Link to="/login" className={LINK_CLASS}>
            {t('register.signIn')}
          </Link>
        </div>
      </form>
    </div>
  )
}

export default RegisterForm
