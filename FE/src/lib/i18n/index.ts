import { createInstance } from 'i18next'
import { initReactI18next } from 'react-i18next'
import { resources } from './resources'
import {
  browserStorage,
  isLanguage,
  languageStorageKey,
  persistLanguage,
  readLanguage,
} from './language.ts'

export const i18n = createInstance()
let initialization: Promise<void> | undefined

export function initializeLanguage(): Promise<void> {
  initialization ??= (async () => {
    i18n.use(initReactI18next)
    await i18n.init({
      resources,
      lng: readLanguage(browserStorage()),
      supportedLngs: ['vi', 'en'],
      fallbackLng: 'vi',
      defaultNS: 'common',
      ns: Object.keys(resources.vi),
      interpolation: { escapeValue: false },
      react: { useSuspense: false },
      saveMissing: false,
      parseMissingKeyHandler: (key) => {
        if (import.meta.env.DEV) console.warn(`[i18n] Missing key: ${key}`)
        return key
      },
    })
    const apply = (value: string) => {
      if (!isLanguage(value)) return
      document.documentElement.lang = value
      document.documentElement.dir = 'ltr'
      persistLanguage(value, browserStorage())
    }
    apply(i18n.language)
    i18n.on('languageChanged', apply)
  })()
  return initialization
}

/** Subscribe at the app boundary; cleanup supports StrictMode and hot reload. */
export function subscribeLanguageStorage(): () => void {
  const synchronize = (event: StorageEvent) => {
    const storage = browserStorage()
    if (event.storageArea !== storage) return
    if (event.key !== languageStorageKey && event.key !== null) return
    const language = isLanguage(event.newValue) ? event.newValue : 'vi'
    if (language !== i18n.language) void i18n.changeLanguage(language)
  }
  window.addEventListener('storage', synchronize)
  return () => window.removeEventListener('storage', synchronize)
}
