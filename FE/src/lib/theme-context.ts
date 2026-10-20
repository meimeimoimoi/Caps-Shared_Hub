import { createContext } from 'react'
import type { ThemePreference, ResolvedTheme } from './theme'
export const ThemeContext = createContext<{
  preference: ThemePreference
  theme: ResolvedTheme
  isDark: boolean
  setPreference: (value: ThemePreference) => void
  toggleTheme: () => void
} | null>(null)
