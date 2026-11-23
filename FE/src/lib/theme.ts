export type ThemePreference = 'light' | 'dark' | 'system'
export type ResolvedTheme = 'light' | 'dark'
export const THEME_STORAGE_KEY = 'shared-hub-theme'
export function readThemePreference(): ThemePreference {
  try {
    const value =
      localStorage.getItem(THEME_STORAGE_KEY) ??
      localStorage.getItem('expert-theme')
    if (value === 'light' || value === 'dark' || value === 'system')
      return value
  } catch {
    /* Storage is optional. */
  }
  return 'system'
}
export function resolveTheme(preference: ThemePreference): ResolvedTheme {
  return preference === 'system'
    ? window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light'
    : preference
}
export function applyTheme(theme: ResolvedTheme) {
  document.documentElement.dataset.theme = theme
}
