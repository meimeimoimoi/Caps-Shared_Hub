import { locales, type Language } from './language.ts'

type Formatter =
  Intl.NumberFormat | Intl.DateTimeFormat | Intl.RelativeTimeFormat
const cache = new Map<string, Formatter>()
const unavailable = '—'

function cached<T extends Formatter>(
  kind: string,
  locale: string,
  options: object,
  build: () => T
): T {
  const key = JSON.stringify([
    kind,
    locale,
    Object.entries(options).sort(([a], [b]) => a.localeCompare(b)),
  ])
  if (!cache.has(key)) {
    // Bound the cache when callers supply many timezone/option combinations.
    if (cache.size >= 100) cache.clear()
    cache.set(key, build())
  }
  return cache.get(key) as T
}

export function formatNumber(
  language: Language,
  value: number | bigint | null | undefined,
  options: Intl.NumberFormatOptions = {}
): string {
  if (value == null || (typeof value === 'number' && !Number.isFinite(value)))
    return unavailable
  const locale = locales[language]
  return cached(
    'number',
    locale,
    options,
    () => new Intl.NumberFormat(locale, options)
  ).format(value)
}

/** Canonical integer strings are never converted to Number. Currency remains VND. */
export function formatMoney(
  language: Language,
  value: number | bigint | string | null | undefined,
  options: {
    currencyDisplay?: 'symbol' | 'code'
    showPositiveSign?: boolean
  } = {}
): string {
  if (typeof value === 'string') {
    if (!/^-?\d+$/.test(value)) return unavailable
    value = BigInt(value)
  }
  if (typeof value === 'number' && Math.abs(value) < 0.5) value = 0
  return formatNumber(language, value, {
    style: 'currency',
    currency: 'VND',
    currencyDisplay: options.currencyDisplay ?? 'symbol',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
    signDisplay: options.showPositiveSign ? 'exceptZero' : 'auto',
  })
}

/** Timestamp timezone is explicit; locale never chooses the business timezone. */
export function formatTimestamp(
  language: Language,
  value: string | number | Date | null | undefined,
  timeZone: string,
  options: Omit<Intl.DateTimeFormatOptions, 'timeZone'> = {}
): string {
  if (value == null || value === '') return unavailable
  const date = new Date(value)
  if (!Number.isFinite(date.getTime())) return unavailable
  const locale = locales[language]
  // Mặc định chỉ dùng khi người gọi không chọn thành phần nào; trộn vào sẽ thêm "day" ngoài ý muốn (vd. chỉ muốn tháng/năm)
  const picksParts = (
    ['dateStyle', 'timeStyle', 'year', 'month', 'day', 'weekday', 'hour', 'minute', 'second'] as const
  ).some((k) => options[k] !== undefined)
  const defaults: Intl.DateTimeFormatOptions = picksParts
    ? {}
    : { year: 'numeric', month: 'short', day: 'numeric' }
  const settings = { ...defaults, ...options, timeZone }
  try {
    return cached(
      'date',
      locale,
      settings,
      () => new Intl.DateTimeFormat(locale, settings)
    ).format(date)
  } catch {
    return unavailable
  }
}

/** Treat YYYY-MM-DD as a calendar date, not a timestamp in the viewer's timezone. */
export function formatDateOnly(
  language: Language,
  value: string | null | undefined,
  options: Omit<Intl.DateTimeFormatOptions, 'timeZone'> = {}
): string {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return unavailable
  const date = new Date(`${value}T00:00:00.000Z`)
  if (
    !Number.isFinite(date.getTime()) ||
    date.toISOString().slice(0, 10) !== value
  )
    return unavailable
  return formatTimestamp(language, date, 'UTC', options)
}

export function formatRelativeTime(
  language: Language,
  value: number,
  unit: Intl.RelativeTimeFormatUnit,
  options: Intl.RelativeTimeFormatOptions = {}
): string {
  if (!Number.isFinite(value)) return unavailable
  const locale = locales[language]
  const settings = { numeric: 'auto' as const, ...options }
  return cached(
    'relative',
    locale,
    settings,
    () => new Intl.RelativeTimeFormat(locale, settings)
  ).format(value, unit)
}
