import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { isLanguage } from '@/lib/i18n/language'
import {
  formatDateOnly,
  formatMoney,
  formatNumber,
  formatRelativeTime,
  formatTimestamp,
} from '@/lib/i18n/formatters'

type WithoutLanguage<T extends (...args: never[]) => unknown> =
  Parameters<T> extends [unknown, ...infer Rest] ? Rest : never

export function useFormatters() {
  const { i18n } = useTranslation('common')
  const language = isLanguage(i18n.language) ? i18n.language : 'vi'
  return useMemo(
    () => ({
      number: (...args: WithoutLanguage<typeof formatNumber>) =>
        formatNumber(language, ...args),
      money: (...args: WithoutLanguage<typeof formatMoney>) =>
        formatMoney(language, ...args),
      dateOnly: (...args: WithoutLanguage<typeof formatDateOnly>) =>
        formatDateOnly(language, ...args),
      timestamp: (...args: WithoutLanguage<typeof formatTimestamp>) =>
        formatTimestamp(language, ...args),
      relativeTime: (...args: WithoutLanguage<typeof formatRelativeTime>) =>
        formatRelativeTime(language, ...args),
    }),
    [language]
  )
}
