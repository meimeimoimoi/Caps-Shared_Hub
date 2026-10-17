// Validate national mobile/fixed-line structure; this does not verify ownership.
// Ô nhập đã hiện sẵn +84 nên bỏ mã quốc gia và số 0 đầu: "0909 422 807" thành "909 422 807".
export function vietnamPhoneInputValue(value: string): string {
  return value.trimStart().replace(/^(?:\+84|0084|84(?=\d{9,10}$)|0)\s*/, '')
}

export function formatVietnamPhoneInput(value: string): string {
  const national = vietnamPhoneInputValue(value).replace(/\s/g, '')
  if (!/^\d+$/.test(national)) return vietnamPhoneInputValue(value)
  const prefixLength = national.startsWith('02')
    ? 3
    : national.startsWith('2')
      ? 2
      : national.startsWith('0')
        ? 4
        : 3
  const middleLength =
    national.startsWith('02') || national.startsWith('2') ? 4 : 3
  return [
    national.slice(0, prefixLength),
    national.slice(prefixLength, prefixLength + middleLength),
    national.slice(prefixLength + middleLength),
  ]
    .filter(Boolean)
    .join(' ')
}

export function normalizeVietnamPhone(value: string): string | null {
  const compact = value.trim().replace(/[\s().-]/g, '')
  let national: string
  if (compact.startsWith('+84')) national = compact.slice(3)
  else if (compact.startsWith('0084')) national = compact.slice(4)
  else if (compact.startsWith('84')) national = compact.slice(2)
  else if (compact.startsWith('0')) national = compact.slice(1)
  else national = compact
  if (!/^(?:[35789]\d{8}|2\d{9})$/.test(national)) return null
  return `+84${national}`
}

export function vietnamPhoneError(value: string): string | undefined {
  if (!value.trim()) return 'Please enter your phone number.'
  if (!normalizeVietnamPhone(value)) return 'Use a Vietnamese number.'
}

export function formatVietnamPhone(value: string): string {
  const normalized = normalizeVietnamPhone(value)
  if (!normalized) return value
  const national = normalized.slice(3)
  return national.length === 9
    ? `+84 ${national.slice(0, 3)} ${national.slice(3, 6)} ${national.slice(6)}`
    : `+84 ${national.slice(0, 2)} ${national.slice(2, 6)} ${national.slice(6)}`
}
