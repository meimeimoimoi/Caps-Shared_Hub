import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@/styles/globals.css'
import App from '@/app/App'
import { applyTheme, readThemePreference, resolveTheme } from '@/lib/theme'
import { initializeLanguage } from '@/lib/i18n'

applyTheme(resolveTheme(readThemePreference()))

void initializeLanguage().then(() =>
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>
  )
)
