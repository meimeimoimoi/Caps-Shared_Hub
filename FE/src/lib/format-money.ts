export type VndFormatOptions = {
  currencyDisplay?: 'symbol' | 'code'
  showPositiveSign?: boolean
}

const formatters = new Map<string, Intl.NumberFormat>()

/** VND amounts use Vietnamese grouping, no decimals and a trailing currency. */
export function formatVnd(
  amount: number | null | undefined,
  { currencyDisplay = 'symbol', showPositiveSign = false }: VndFormatOptions = {}
): string {
  if (amount == null || !Number.isFinite(amount)) return '\u2014'

  const key = `${currencyDisplay}:${showPositiveSign}`
  let formatter = formatters.get(key)
  if (!formatter) {
    formatter = new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      currencyDisplay,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
      signDisplay: showPositiveSign ? 'exceptZero' : 'auto',
    })
    formatters.set(key, formatter)
  }

  // Avoid displaying a negative zero after rounding to whole dong.
  return formatter.format(Math.abs(amount) < 0.5 ? 0 : amount)
}
