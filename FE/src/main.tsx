import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@/styles/globals.css'
import App from '@/app/App'
import { applyTheme, readThemePreference, resolveTheme } from '@/lib/theme'
import { initializeLanguage } from '@/lib/i18n'
import { installMotionTokens } from '@/components/ui/motion'

applyTheme(resolveTheme(readThemePreference()))
installMotionTokens(document.documentElement)

void initializeLanguage().then(() =>
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>
  )
)
