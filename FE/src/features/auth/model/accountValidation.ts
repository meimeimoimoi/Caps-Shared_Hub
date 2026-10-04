import { vietnamPhoneError } from '../../../shared/lib/validation/vietnamPhone.ts'

export type AccountField = 'name' | 'email' | 'phone' | 'password' | 'confirmPassword' | 'terms'

export function passwordRequirements(password: string) {
  return [
    { label: 'At least 12 characters', met: password.length >= 12 },
    { label: 'An uppercase letter (A–Z)', met: /[A-Z]/.test(password) },
    { label: 'A lowercase letter (a–z)', met: /[a-z]/.test(password) },
    { label: 'A number (0–9)', met: /[0-9]/.test(password) },
    { label: 'A special character (e.g. !@#$)', met: /[^\p{L}\p{N}\s]/u.test(password) },
  ]
}

export function validateAccount(values: { name: string; email: string; phone: string; password: string; confirmPassword: string; terms: boolean }): Partial<Record<AccountField, string>> {
  const errors: Partial<Record<AccountField, string>> = {}
  const name = values.name.trim()
  if (!name) errors.name = 'Please enter your full name.'
  else if (name.length < 2 || name.length > 100) errors.name = 'Full name must contain 2–100 characters.'
  else if (!/^[\p{L}\p{M}][\p{L}\p{M}\s.’\x27-]*$/u.test(name)) errors.name = 'Use letters, spaces, hyphens or apostrophes for your name.'
  const email = values.email.trim()
  if (!email) errors.email = 'Please enter your email address.'
  else if (email.length > 254 || !/^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)+$/.test(email)) errors.email = 'Enter a valid email address, such as you@example.com.'
  const phoneError = vietnamPhoneError(values.phone)
  if (phoneError) errors.phone = phoneError
  if (!values.password) errors.password = 'Please enter a password.'
  else if (!passwordRequirements(values.password).every((rule) => rule.met)) errors.password = 'Complete all five password requirements below.'
  if (!values.confirmPassword) errors.confirmPassword = 'Please confirm your password.'
  else if (values.confirmPassword !== values.password) errors.confirmPassword = 'Passwords do not match. Enter the same password in both fields.'
  if (!values.terms) errors.terms = 'Please agree to the terms and conditions and privacy policy to continue.'
  return errors
}
