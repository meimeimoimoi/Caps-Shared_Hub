import { normalizeVietnamPhone } from '../../../lib/validation/vietnamPhone.ts'

export type AccountField =
  'name' | 'email' | 'phone' | 'password' | 'confirmPassword' | 'terms'

export function passwordRequirements(password: string) {
  return [
    {
      key: 'passwordRules.length',
      label: 'At least 12 characters',
      met: password.length >= 12,
    },
    {
      key: 'passwordRules.uppercase',
      label: 'An uppercase letter (A–Z)',
      met: /[A-Z]/.test(password),
    },
    {
      key: 'passwordRules.lowercase',
      label: 'A lowercase letter (a–z)',
      met: /[a-z]/.test(password),
    },
    {
      key: 'passwordRules.number',
      label: 'A number (0–9)',
      met: /[0-9]/.test(password),
    },
    {
      key: 'passwordRules.symbol',
      label: 'A special character (e.g. !@#$)',
      met: /[^\p{L}\p{N}\s]/u.test(password),
    },
  ] as const
}

type AccountValues = {
  name: string
  email: string
  phone: string
  password: string
  confirmPassword: string
  terms: boolean
}

const legacyMessages = {
  nameRequired: 'Please enter your full name.',
  nameLength: 'Full name must contain 2–100 characters.',
  nameCharacters: 'Use letters, spaces, hyphens or apostrophes for your name.',
  emailRequired: 'Please enter your email address.',
  emailInvalid: 'Enter a valid email address, such as you@example.com.',
  phoneRequired: 'Please enter your phone number.',
  phoneInvalid: 'Use a Vietnamese number.',
  passwordRequired: 'Please enter a password.',
  passwordRules: 'Complete all five password requirements below.',
  confirmationRequired: 'Please confirm your password.',
  passwordMismatch:
    'Passwords do not match. Enter the same password in both fields.',
  terms:
    'Please agree to the terms and conditions and privacy policy to continue.',
} as const

export function validateAccountIssues(
  values: AccountValues
): Partial<Record<AccountField, keyof typeof legacyMessages>> {
  const errors: Partial<Record<AccountField, keyof typeof legacyMessages>> = {}
  const name = values.name.trim()
  if (!name) errors.name = 'nameRequired'
  else if (name.length < 2 || name.length > 100) errors.name = 'nameLength'
  else if (!/^[\p{L}\p{M}][\p{L}\p{M}\s.’\x27-]*$/u.test(name))
    errors.name = 'nameCharacters'
  const email = values.email.trim()
  if (!email) errors.email = 'emailRequired'
  else if (
    email.length > 254 ||
    !/^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)+$/.test(email)
  )
    errors.email = 'emailInvalid'
  if (!values.phone.trim()) errors.phone = 'phoneRequired'
  else if (!normalizeVietnamPhone(values.phone)) errors.phone = 'phoneInvalid'
  if (!values.password) errors.password = 'passwordRequired'
  else if (!passwordRequirements(values.password).every((rule) => rule.met))
    errors.password = 'passwordRules'
  if (!values.confirmPassword) errors.confirmPassword = 'confirmationRequired'
  else if (values.confirmPassword !== values.password)
    errors.confirmPassword = 'passwordMismatch'
  if (!values.terms) errors.terms = 'terms'
  return errors
}

/** Compatibility for existing callers/tests; migrated UI uses locale-independent issues. */
export function validateAccount(
  values: AccountValues
): Partial<Record<AccountField, string>> {
  return Object.fromEntries(
    Object.entries(validateAccountIssues(values)).map(([field, code]) => [
      field,
      legacyMessages[code],
    ])
  )
}
