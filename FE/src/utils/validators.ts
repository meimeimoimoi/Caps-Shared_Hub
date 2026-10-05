export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export function isValidEmail(email: string): boolean {
  return EMAIL_REGEX.test(email.trim())
}

export type LoginFormValues = {
  email: string
  password: string
}

export type LoginFormErrors = {
  email?: string
  password?: string
}

export function validateLogin(values: LoginFormValues): LoginFormErrors {
  const errors: LoginFormErrors = {}
  const email = values.email.trim()

  if (!email) {
    errors.email = 'Vui lòng nhập email.'
  } else if (!isValidEmail(email)) {
    errors.email = 'Nhập email hợp lệ, ví dụ ban@doanhnghiep.vn.'
  }

  if (!values.password) {
    errors.password = 'Nhập mật khẩu của bạn.'
  }

  return errors
}
