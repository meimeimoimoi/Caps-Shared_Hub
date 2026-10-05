export function safeReturnPath(value: unknown): string {
  if (typeof value !== 'string') return '/dashboard'
  // Explicit route allowlist excludes scheme-relative URLs, login loops and unknown routes.
  const path = value.split(/[?#]/)[0]
  return ['/dashboard', '/expert', '/expert/overview'].includes(path) ? value : '/dashboard'
}
