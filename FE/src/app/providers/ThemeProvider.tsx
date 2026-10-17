import { useEffect, useState, type ReactNode } from 'react'
import { ThemeContext } from '@/lib/theme-context'
import {
  applyTheme,
  readThemePreference,
  resolveTheme,
  THEME_STORAGE_KEY,
  type ThemePreference,
} from '@/lib/theme'
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreference] =
    useState<ThemePreference>(readThemePreference)
  const [systemDark, setSystemDark] = useState(
    () => resolveTheme('system') === 'dark'
  )
  const theme =
    preference === 'system' ? (systemDark ? 'dark' : 'light') : preference
  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const update = () => setSystemDark(media.matches)
    media.addEventListener('change', update)
    const sync = (event: StorageEvent) => {
      if (event.key === THEME_STORAGE_KEY || event.key === null)
        setPreference(readThemePreference())
    }
    window.addEventListener('storage', sync)
    return () => {
      media.removeEventListener('change', update)
      window.removeEventListener('storage', sync)
    }
  }, [])
  useEffect(() => {
    applyTheme(theme)
    try {
      localStorage.setItem(THEME_STORAGE_KEY, preference)
    } catch {
      /* In-memory selection still works. */
    }
  }, [preference, theme])
  return (
    <ThemeContext.Provider
      value={{
        preference,
        theme,
        isDark: theme === 'dark',
        setPreference,
        toggleTheme: () => setPreference(theme === 'dark' ? 'light' : 'dark'),
      }}
    >
      {children}
    </ThemeContext.Provider>
  )
}
