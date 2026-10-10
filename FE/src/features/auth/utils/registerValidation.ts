import { isValidEmail } from '@/utils/validators'
import { passwordRequirements } from './accountValidation'
import type { RegisterFormValues } from '../types'

export type RegisterField = 'name' | 'email' | 'password' | 'confirmPassword' | 'terms'

// Khóa i18n nằm trong namespace auth (validation.*)
export type RegisterIssueKey =
  | 'validation.nameRequired'
  | 'validation.nameLength'
  | 'validation.nameCharacters'
  | 'validation.emailRequired'
  | 'validation.emailInvalid'
  | 'validation.passwordRequired'
  | 'validation.passwordRules'
  | 'validation.confirmationRequired'
  | 'validation.passwordMismatch'
  | 'validation.terms'

export type RegisterIssue = Partial<Record<RegisterField, RegisterIssueKey>>

export function validateRegister(values: RegisterFormValues): RegisterIssue {
  const errors: RegisterIssue = {}
  const name = values.name.trim()
  if (!name) errors.name = 'validation.nameRequired'
  else if (name.length < 2 || name.length > 100) errors.name = 'validation.nameLength'
  else if (!/^[\p{L}\p{M}][\p{L}\p{M}\s.’\x27-]*$/u.test(name))
    errors.name = 'validation.nameCharacters'

  const email = values.email.trim()
  if (!email) errors.email = 'validation.emailRequired'
  else if (!isValidEmail(email)) errors.email = 'validation.emailInvalid'

  if (!values.password) errors.password = 'validation.passwordRequired'
  else if (!passwordRequirements(values.password).every((rule) => rule.met))
    errors.password = 'validation.passwordRules'

  if (!values.confirmPassword) errors.confirmPassword = 'validation.confirmationRequired'
  else if (values.confirmPassword !== values.password)
    errors.confirmPassword = 'validation.passwordMismatch'

  if (!values.terms) errors.terms = 'validation.terms'
  return errors
}
