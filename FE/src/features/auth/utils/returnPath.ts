/** Trang khách hàng vào sau khi đăng nhập/đăng ký khi không có trang nào cần quay lại. */
export const DEFAULT_HOME = '/drafts'

// Chỉ quay về các khu vực đã biết; loại URL dạng //host, vòng lặp về /login và route lạ.
const allowedSections = ['/drafts', '/dashboard', '/expert']

export function safeReturnPath(value: unknown): string {
  if (
    typeof value !== 'string' ||
    !value.startsWith('/') ||
    value.startsWith('//')
  )
    return DEFAULT_HOME
  const path = value.split(/[?#]/)[0]
  return allowedSections.some(
    (section) => path === section || path.startsWith(`${section}/`)
  )
    ? value
    : DEFAULT_HOME
}
