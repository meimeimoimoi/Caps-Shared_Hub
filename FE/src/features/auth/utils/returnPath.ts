/** Trang khách hàng vào sau khi đăng nhập/đăng ký khi không có trang nào cần quay lại. */
export const DEFAULT_HOME = '/drafts'

// Chỉ quay về các khu vực đã biết; loại URL dạng //host, vòng lặp về /login và route lạ.
const allowedSections = [
  '/drafts',
  '/dashboard',
  '/expert',
  '/experts',
  '/marketplace',
  '/ai-assistant',
  '/cases',
  '/wallet',
  '/account',
  // Staff areas check permissions themselves (PermissionRoute shows 403)
  '/admin',
  '/knowledge',
  '/reviewer',
]

export function safeReturnPath(value: unknown): string {
  if (
    typeof value !== 'string' ||
    !value.startsWith('/') ||
    value.startsWith('//')
  )
    return DEFAULT_HOME
  const path = value.split(/[?#]/)[0]
  // Router chuẩn hóa '.'/'..', nên '/drafts/../admin' sẽ thoát khỏi khu được phép
  if (path.includes('\\') || /(^|\/)\.{1,2}(\/|$)/.test(path))
    return DEFAULT_HOME
  return allowedSections.some(
    (section) => path === section || path.startsWith(`${section}/`)
  )
    ? value
    : DEFAULT_HOME
}
