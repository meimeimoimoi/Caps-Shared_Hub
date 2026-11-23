import type { Language } from '@/lib/i18n/language'

/** Strip valid grouping only. Decimal/invalid input must remain invalid, never become another amount. */
export function parseMoneyInput(value: string, language: Language): string {
  const trimmed = value.trim()
  if (/^\d+$/.test(trimmed) || !trimmed) return trimmed
  const grouped =
    language === 'vi' ? /^\d{1,3}(?:\.\d{3})+$/ : /^\d{1,3}(?:,\d{3})+$/
  if (grouped.test(trimmed) || /^\d{1,3}(?:[\s\u00a0]\d{3})+$/.test(trimmed))
    return trimmed.replace(/[.,\s\u00a0]/g, '')
  return value
}
