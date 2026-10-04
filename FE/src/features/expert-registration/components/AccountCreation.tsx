import { formatVietnamPhoneInput, normalizeVietnamPhone, vietnamPhoneInputValue } from '../utils/vietnamPhone'
import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Check, ChevronDown, Circle, CircleAlert, Eye, EyeOff, Loader2 } from 'lucide-react'
import type { Profile } from '../types'
import { FormField } from './FormField'
import { passwordRequirements, validateAccount, type AccountField } from '../utils/accountValidation'

export interface AccountCreationProps {
  profile: Profile
  formErrors: Record<string, string>
  submitting: boolean
  onUpdate: (key: keyof Profile, value: string) => void
  onSubmit: (e: FormEvent<HTMLFormElement>) => void
  // Supply destinations only once genuine policy routes are available.
  policyRoutes?: { terms?: string; privacy?: string }
}

const panelCls =
  'relative bg-ex-panel rounded-[3px] p-8 md:p-10 shadow-ex-dossier max-md:p-[24px] before:absolute before:top-0 before:left-8 before:right-8 before:h-px before:bg-ex-ink'
const mutedCls = 'text-[13px] text-ex-muted font-normal'
const btnBase =
  'cursor-pointer inline-flex items-center justify-center gap-2 min-h-11 px-[17px] py-[9px] border border-ex-btn-border rounded-md bg-white text-ex-ink font-semibold transition-[background,border-color,opacity] duration-150 ease-in-out hover:bg-ex-btn-hover disabled:cursor-not-allowed disabled:opacity-55 motion-reduce:transition-none'
const inputCls =
  'w-full px-3 py-2.5 border border-ex-input-border rounded-[5px] bg-white text-ex-ink min-h-11 font-normal caret-ex-accent transition-[border-color,box-shadow] duration-150 ease-in-out focus:border-ex-accent focus:shadow-[0_0_0_3px_var(--color-ex-ring)] motion-reduce:transition-none'

export function AccountCreation({
  profile,
  formErrors,
  submitting,
  onUpdate,
  onSubmit,
  policyRoutes,
}: AccountCreationProps) {
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [accepted, setAccepted] = useState(false)
  const [attempted, setAttempted] = useState(false)
  const [passwordFocused, setPasswordFocused] = useState(false)
  const [requirementsExpanded, setRequirementsExpanded] = useState(false)
  const [touched, setTouched] = useState<Partial<Record<AccountField, boolean>>>({})
  const touch = (key: AccountField) => setTouched((current) => ({ ...current, [key]: true }))
  const errors = validateAccount({ name: profile.name, email: profile.email, phone: profile.phone, password, confirmPassword: confirmation, terms: accepted })
  const fieldError = (key: AccountField) => (attempted || touched[key] || (key === 'confirmPassword' && confirmation.length > 0)) ? errors[key] : undefined
  const passwordError = fieldError('password')
  const confirmationError = fieldError('confirmPassword')
  const termsError = fieldError('terms')
  const phoneError = fieldError('phone') || formErrors.phone
  const requirements = passwordRequirements(password)
  const passed = requirements.filter((rule) => rule.met).length
  const strength = !password ? 'empty' : passed === 5 ? 'high' : passed >= 3 ? 'medium' : 'low'
  const strengthLabel = strength === 'empty' ? '' : strength === 'high' ? 'High' : strength === 'medium' ? 'Medium' : 'Low'

  const showRequirements = passwordFocused || requirementsExpanded || !!passwordError

  const renderPassword = (confirm: boolean) => {
    const name = confirm ? 'confirmPassword' : 'password'
    const visible = confirm ? showConfirmation : showPassword
    const error = confirm ? confirmationError : passwordError
    return (
      <FormField htmlFor={name} label={confirm ? 'Confirm password *' : 'Password *'} error={error} errorId={`error-${name}`}>
        <span className="expert-password-field">
          <input
            id={name} name={name} type={visible ? 'text' : 'password'} required
            autoComplete="new-password" value={confirm ? confirmation : password}
            minLength={confirm ? undefined : 12}
            onFocus={() => { if (!confirm) setPasswordFocused(true) }}
            onBlur={() => { touch(name); if (!confirm) setPasswordFocused(false) }}
            placeholder={confirm ? 'Confirm password' : 'Enter your password'}
            onChange={(e) => (confirm ? setConfirmation : setPassword)(e.target.value)}
            aria-invalid={!!error} aria-describedby={[error ? `error-${name}` : '', !confirm ? 'password-guidance' : ''].filter(Boolean).join(' ') || undefined}
            className={inputCls}
          />
          <button type="button" className="expert-password-toggle"
            aria-label={`${visible ? 'Hide' : 'Show'} ${confirm ? 'confirmation password' : 'password'}`}
            aria-controls={name} aria-pressed={visible}
            onClick={() => (confirm ? setShowConfirmation : setShowPassword)(!visible)}>
            {visible ? <EyeOff size={20} aria-hidden="true" /> : <Eye size={20} aria-hidden="true" />}
          </button>
        </span>
      </FormField>
    )
  }

  const renderInput = (key: keyof Profile, required = false, type = 'text') => {
    const error = fieldError(key as AccountField) || formErrors[key]
    const errorId = error ? `error-${key}` : undefined
    return (
      <input
        id={key}
        type={type}
        name={key} autoComplete={key === 'name' ? 'name' : key === 'email' ? 'email' : 'tel'} placeholder={key === 'name' ? 'Your full name' : key === 'email' ? 'you@example.com' : '+84 912 345 678'}
        required={required}
        maxLength={key === 'name' ? 100 : key === 'email' ? 254 : undefined}
        onBlur={() => { touch(key as AccountField); if (key === 'phone') { const phone = normalizeVietnamPhone(profile.phone); if (phone) onUpdate('phone', phone) } }}
        value={profile[key]}
        onChange={(e) => onUpdate(key, e.target.value)}
        aria-invalid={!!error}
        aria-describedby={errorId}
        className={inputCls}
      />
    )
  }

  return (
    <form className={`${panelCls} expert-account-form`} noValidate onSubmit={(e) => {
      e.preventDefault()
      if (submitting) return
      setAttempted(true)
      const firstInvalid = (['name', 'phone', 'email', 'password', 'confirmPassword', 'terms'] as const).find((key) => errors[key])
      if (firstInvalid) {
        e.currentTarget.querySelector<HTMLInputElement>(`[name="${firstInvalid}"]`)?.focus()
        return
      }
      onSubmit(e)
    }}>
      <h2 className="text-center">
        Create your expert account
      </h2>
      <p className={`${mutedCls} expert-account-signin text-center`}>
        Already registered? <Link to="/login">Sign in</Link>
      </p>
      <div className="expert-account-fields">
        <FormField label="Full name *" htmlFor="name" error={fieldError('name') || formErrors.name} errorId="error-name">
          {renderInput('name', true)}
        </FormField>
        <FormField label="Phone number *" htmlFor="phone" error={phoneError} errorId="error-phone">
          <div className="expert-phone-field" data-invalid={!!phoneError}>
            <span className="expert-phone-prefix" id="phone-country">
              <svg viewBox="0 0 30 20" width="21" height="14" role="img" aria-label="Vietnam">
                <rect width="30" height="20" fill="#da251d" />
                <path d="M15 3 16.6 7.8H21.7L17.6 10.8 19.2 15.7 15 12.7 10.8 15.7 12.4 10.8 8.3 7.8H13.4Z" fill="#ffff00" />
              </svg>
              <span>+84</span>
            </span>
            <input id="phone" name="phone" type="tel" inputMode="tel" autoComplete="tel-national" required
              value={vietnamPhoneInputValue(profile.phone)} placeholder="912 345 678"
              onChange={(e) => onUpdate('phone', vietnamPhoneInputValue(e.target.value))}
              onBlur={() => { touch('phone'); onUpdate('phone', formatVietnamPhoneInput(profile.phone)) }}
              aria-invalid={!!phoneError}
              aria-describedby={`phone-country${phoneError ? ' error-phone' : ''}`}
              className={inputCls} />
          </div>
        </FormField>
        <div className="expert-account-wide">
          <FormField label="Email address *" htmlFor="email" error={fieldError('email') || formErrors.email} errorId="error-email">
            {renderInput('email', true, 'email')}
          </FormField>
        </div>
        {renderPassword(false)}
        {renderPassword(true)}
        <div id="password-guidance" className="expert-password-guidance expert-account-wide" data-strength={strength}>
          <div className="expert-password-feedback" hidden={!password}>
          <div className="expert-password-strength-label"><span>Password strength</span><strong>{strengthLabel}</strong></div>
          <div className="expert-password-meter" role="meter" aria-label="Password requirements met" aria-valuemin={0} aria-valuemax={5} aria-valuenow={passed} aria-valuetext={`${strengthLabel}: ${passed} of 5 requirements met`}>
            <span style={{ transform: `scaleX(${password ? passed / 5 : 0})` }} />
          </div>
          </div>
          <button type="button" className="expert-password-help" aria-expanded={showRequirements} aria-controls="password-requirements"
            onClick={() => setRequirementsExpanded((expanded) => !expanded)}>
            <span>{passed === 5 ? 'All password requirements met' : '12+ characters; uppercase, lowercase, number & symbol'}</span>
            <ChevronDown size={16} aria-hidden="true" />
          </button>
          <ul id="password-requirements" className="expert-password-requirements" hidden={!showRequirements}>
            {requirements.map((rule) => <li key={rule.label} data-met={rule.met}>
              {rule.met ? <Check size={15} aria-hidden="true" /> : <Circle size={15} aria-hidden="true" />}
              <span><span className="sr-only">{rule.met ? 'Met: ' : 'Not met: '}</span>{rule.label}</span>
            </li>)}
          </ul>
        </div>
      </div>
      <div className="expert-account-consent">
        <div className="expert-account-consent-row">
          <input id="account-terms" type="checkbox" name="terms" required checked={accepted}
            onChange={(e) => setAccepted(e.target.checked)} onBlur={() => touch('terms')}
            aria-invalid={!!termsError} aria-describedby={termsError ? 'error-terms' : undefined} />
          <label htmlFor="account-terms">I agree to the{' '}
            {policyRoutes?.terms ? <Link to={policyRoutes.terms}>terms and conditions</Link> : <span className="expert-policy-text">terms and conditions</span>}
            {' '}and{' '}
            {policyRoutes?.privacy ? <Link to={policyRoutes.privacy}>privacy policy</Link> : <span className="expert-policy-text">privacy policy</span>}.
          </label>
        </div>
        {termsError && <p id="error-terms" role="alert" className="expert-field-error"><CircleAlert size={15} aria-hidden="true" /><span>{termsError}</span></p>}
      </div>
      <button
        type="submit"
        className={`${btnBase} w-full expert-submit-btn ${submitting ? 'opacity-70' : ''}`}
        disabled={submitting}
        aria-busy={submitting}
      >
        {submitting && <Loader2 size={16} className="animate-spin motion-reduce:animate-none" aria-hidden="true" />}
        {submitting ? 'Creating…' : 'Create account'}{' '}
        {!submitting && <ArrowRight size={16} />}
      </button>
    </form>
  )
}
