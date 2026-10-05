import type { InputValues, SchemaField } from '../types'

export function normalizeInput(
  input: InputValues,
  fields: SchemaField[]
): InputValues {
  return Object.fromEntries(
    fields.map((field) => [field.id, (input[field.id] ?? '').trim()])
  )
}
export function validateInput(
  input: InputValues,
  fields: SchemaField[]
): Record<string, string> {
  const errors: Record<string, string> = {}
  for (const field of fields) {
    const value = (input[field.id] ?? '').trim()
    if (!value && field.required)
      errors[field.id] = `${field.label} is required.`
    else if (value) {
      if (field.pattern && !new RegExp(field.pattern).test(value))
        errors[field.id] = field.hint ?? 'Check the format.'
      if (field.maxLength && value.length > field.maxLength)
        errors[field.id] = `Use at most ${field.maxLength} characters.`
      if (field.type === 'money' && !/^\d{1,15}$/.test(value))
        errors[field.id] =
          'Enter a non-negative whole VND amount (up to 15 digits).'
      if (field.type === 'year' && !/^\d{4}$/.test(value))
        errors[field.id] = 'Enter a four-digit tax year.'
      if (
        field.type === 'date' &&
        (!/^\d{4}-\d{2}-\d{2}$/.test(value) ||
          Number.isNaN(Date.parse(value)) ||
          new Date(value).toISOString().slice(0, 10) !== value)
      )
        errors[field.id] = 'Enter a valid date.'
    }
  }
  return errors
}
export function formatField(
  value: string | undefined,
  field: SchemaField
): string {
  if (!value) return 'Not provided'
  if (field.type === 'money' && /^\d+$/.test(value))
    return `${new Intl.NumberFormat('vi-VN').format(BigInt(value))} VND`
  return value
}
export function timestamp(value?: string) {
  return value
    ? new Intl.DateTimeFormat('en-GB', {
        dateStyle: 'medium',
        timeStyle: 'short',
        timeZone: 'Asia/Bangkok',
      }).format(new Date(value)) + ' (UTC+7)'
    : 'Not saved'
}
