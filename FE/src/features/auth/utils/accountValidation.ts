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

type Issue = keyof typeof legacyMessages

function nameIssue(value: string): Issue | undefined {
  const name = value.trim()
  if (!name) return 'nameRequired'
  if (name.length < 2 || name.length > 100) return 'nameLength'
  if (!/^[\p{L}\p{M}][\p{L}\p{M}\s.’\x27-]*$/u.test(name))
    return 'nameCharacters'
}

function emailIssue(value: string): Issue | undefined {
  const email = value.trim()
  if (!email) return 'emailRequired'
  if (email.length > 254 || !/^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)+$/.test(email))
    return 'emailInvalid'
}

function passwordIssue(password: string): Issue | undefined {
  if (!password) return 'passwordRequired'
  if (!passwordRequirements(password).every((rule) => rule.met))
    return 'passwordRules'
}

function compact<T extends string>(
  issues: Record<T, Issue | undefined>
): Partial<Record<T, Issue>> {
  return Object.fromEntries(
    Object.entries(issues).filter(([, issue]) => issue)
  ) as Partial<Record<T, Issue>>
}

export function validateAccountIssues(
  values: AccountValues
): Partial<Record<AccountField, Issue>> {
  return compact({
    name: nameIssue(values.name),
    email: emailIssue(values.email),
    phone: !values.phone.trim()
      ? 'phoneRequired'
      : !normalizeVietnamPhone(values.phone)
        ? 'phoneInvalid'
        : undefined,
    password: passwordIssue(values.password),
    confirmPassword: !values.confirmPassword
      ? 'confirmationRequired'
      : values.confirmPassword !== values.password
        ? 'passwordMismatch'
        : undefined,
    terms: values.terms ? undefined : 'terms',
  } satisfies Record<AccountField, Issue | undefined>)
}

export type SignupField = 'name' | 'email' | 'password' | 'terms'

/** Đăng ký khách hàng: gọn hơn hồ sơ chuyên gia (không số điện thoại, không nhập lại mật khẩu). */
export function validateSignupIssues(values: {
  name: string
  email: string
  password: string
  terms: boolean
}): Partial<Record<SignupField, Issue>> {
  return compact({
    name: nameIssue(values.name),
    email: emailIssue(values.email),
    password: passwordIssue(values.password),
    terms: values.terms ? undefined : 'terms',
  } satisfies Record<SignupField, Issue | undefined>)
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
