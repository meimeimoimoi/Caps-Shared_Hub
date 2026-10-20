export const languages = ['vi', 'en'] as const
export type Language = (typeof languages)[number]
export const languageStorageKey = 'shared-hub-language'
export const legacyLanguageStorageKey = 'expert-lang'
export const locales = { vi: 'vi-VN', en: 'en-US' } as const

export function isLanguage(value: unknown): value is Language {
  return value === 'vi' || value === 'en'
}

export function readLanguage(storage?: Pick<Storage, 'getItem'>): Language {
  try {
    const current = storage?.getItem(languageStorageKey)
    if (isLanguage(current)) return current
    const legacy = storage?.getItem(legacyLanguageStorageKey)
    if (isLanguage(legacy)) return legacy
  } catch {
    // Restricted storage still permits a language preference for this session.
  }
  return 'vi'
}

export function browserStorage(): Storage | undefined {
  try {
    return window.localStorage
  } catch {
    return undefined
  }
}

export function persistLanguage(
  language: Language,
  storage?: Pick<Storage, 'setItem' | 'removeItem'>
) {
  try {
    storage?.setItem(languageStorageKey, language)
    storage?.removeItem(legacyLanguageStorageKey)
  } catch {
    // The engine remains the source of truth when persistence is unavailable.
  }
}
