/** Customer destination after sign-in or sign-up when there is no page to return to. */
export const DEFAULT_HOME = '/ai-assistant'

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

export function safeReturnPath(value: unknown, fallback = DEFAULT_HOME): string {
  if (
    typeof value !== 'string' ||
    !value.startsWith('/') ||
    value.startsWith('//')
  )
    return fallback
  const path = value.split(/[?#]/)[0]
  // Reject dot segments before router normalization can escape an allowed section.
  if (path.includes('\\') || /(^|\/)\.{1,2}(\/|$)/.test(path))
    return fallback
  return allowedSections.some(
    (section) => path === section || path.startsWith(`${section}/`)
  )
    ? value
    : fallback
}

/** Expert sign-in only resumes destinations inside the expert workspace. */
export function expertLoginReturnPath(value: unknown): string {
  const destination = safeReturnPath(value, '/expert')
  const path = destination.split(/[?#]/)[0]
  return path === '/expert' || path.startsWith('/expert/')
    ? destination
    : '/expert'
}

/** Customer sign-up must not inherit an expert portal destination from sign-in. */
export function customerRegistrationReturnPath(value: unknown): string {
  const destination = safeReturnPath(value)
  const path = destination.split(/[?#]/)[0]
  return path === '/expert' || path.startsWith('/expert/')
    ? DEFAULT_HOME
    : destination
}
