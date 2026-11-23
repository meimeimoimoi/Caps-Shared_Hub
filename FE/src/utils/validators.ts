export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export function isValidEmail(email: string): boolean {
  return EMAIL_REGEX.test(email.trim())
}

export type LoginFormValues = {
  email: string
  password: string
}

export type LoginFormErrors = {
  email?: 'validation.emailRequired' | 'validation.emailInvalid'
  password?: 'validation.passwordRequired'
}

export function validateLogin(values: LoginFormValues): LoginFormErrors {
  const errors: LoginFormErrors = {}
  const email = values.email.trim()

  if (!email) {
    errors.email = 'validation.emailRequired'
  } else if (!isValidEmail(email)) {
    errors.email = 'validation.emailInvalid'
  }

  if (!values.password) {
    errors.password = 'validation.passwordRequired'
  }

  return errors
}
