import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import type { Profile } from '../types'
import { FormField } from './FormField'

export interface AccountCreationProps {
  profile: Profile
  formErrors: Record<string, string>
  submitting: boolean
  onUpdate: (key: keyof Profile, value: string) => void
  onSubmit: (e: FormEvent<HTMLFormElement>) => void
}

const panelCls =
  'bg-ex-panel rounded-lg p-8 shadow-[0_8px_28px_#25302509] max-md:p-[18px_24px]'
const mutedCls = 'text-[13px] text-ex-muted font-normal'
const noteCls =
  'px-[18px] py-4 bg-ex-note-bg rounded-[5px] my-5 text-sm [&>p:last-child]:mb-0'
const btnBase =
  'cursor-pointer inline-flex items-center justify-center gap-2 min-h-11 px-[17px] py-[9px] border border-ex-btn-border rounded-md bg-white text-ex-ink font-semibold transition-[background,border-color,opacity] duration-150 ease-in-out hover:bg-ex-btn-hover disabled:cursor-not-allowed disabled:opacity-55 motion-reduce:transition-none'
const btnPrimary = `${btnBase} !bg-ex-accent !border-ex-accent !text-white hover:!bg-ex-accent-hover`
const inputCls =
  'w-full px-3 py-2.5 border border-ex-input-border rounded-[5px] bg-white text-ex-ink min-h-11 font-normal caret-ex-accent transition-[border-color,box-shadow] duration-150 ease-in-out focus:border-ex-accent focus:shadow-[0_0_0_3px_var(--color-ex-ring)] motion-reduce:transition-none'

export function AccountCreation({
  profile,
  formErrors,
  submitting,
  onUpdate,
  onSubmit,
}: AccountCreationProps) {
  const renderInput = (key: keyof Profile, required = false, type = 'text') => {
    const errorId = formErrors[key] ? `error-${key}` : undefined
    return (
      <input
        type={type}
        name={key}
        required={required}
        value={profile[key]}
        onChange={(e) => onUpdate(key, e.target.value)}
        aria-invalid={!!formErrors[key]}
        aria-describedby={errorId}
        className={`${inputCls} ${formErrors[key] ? '!border-ex-error-text focus:shadow-[0_0_0_3px_#d9302533]' : ''}`}
      />
    )
  }

  return (
    <form className={panelCls} noValidate onSubmit={onSubmit}>
      <h2>Create an expert account</h2>
      <p className={mutedCls}>
        Already registered? <Link to="/login">Sign in</Link>
      </p>
      <FormField
        label="Full name *"
        error={formErrors.name}
        errorId="error-name"
      >
        {renderInput('name', true)}
      </FormField>
      <FormField
        label="Email address *"
        error={formErrors.email}
        errorId="error-email"
      >
        {renderInput('email', true, 'email')}
      </FormField>
      <FormField
        label="Phone number"
        error={formErrors.phone}
        errorId="error-phone"
      >
        {renderInput('phone', false, 'tel')}
      </FormField>
      <p className={noteCls}>
        This preview does not collect a password or create a real account.
        Account verification and terms acceptance will be connected with the
        registration API.
      </p>
      <button
        className={`${btnPrimary} w-full ${submitting ? 'ex-loading' : ''}`}
        disabled={submitting}
      >
        {submitting ? 'Creating…' : 'Continue to application'}{' '}
        {!submitting && <ArrowRight size={16} />}
      </button>
    </form>
  )
}
