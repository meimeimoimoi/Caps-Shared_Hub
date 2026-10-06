import type { InputValues, SchemaField } from '../types'

export function normalizeInput(
  input: InputValues,
  fields: SchemaField[]
): InputValues {
  return Object.fromEntries(
    fields.map((field) => [field.id, (input[field.id] ?? '').trim()])
  )
}
export type InputIssue = {
  code: 'required' | 'format' | 'maxLength' | 'money' | 'year' | 'date'
  label?: string
  maximum?: number
  hint?: string
}
export function validateInputIssues(
  input: InputValues,
  fields: SchemaField[]
): Record<string, InputIssue> {
  const errors: Record<string, InputIssue> = {}
  for (const field of fields) {
    const value = (input[field.id] ?? '').trim()
    if (!value && field.required)
      errors[field.id] = { code: 'required', label: field.label }
    else if (value) {
      if (field.pattern && !new RegExp(field.pattern).test(value))
        errors[field.id] = { code: 'format', hint: field.hint }
      if (field.maxLength && value.length > field.maxLength)
        errors[field.id] = { code: 'maxLength', maximum: field.maxLength }
      if (field.type === 'money' && !/^\d{1,15}$/.test(value))
        errors[field.id] = { code: 'money' }
      if (field.type === 'year' && !/^\d{4}$/.test(value))
        errors[field.id] = { code: 'year' }
      if (
        field.type === 'date' &&
        (!/^\d{4}-\d{2}-\d{2}$/.test(value) ||
          Number.isNaN(Date.parse(value)) ||
          new Date(value).toISOString().slice(0, 10) !== value)
      )
        errors[field.id] = { code: 'date' }
    }
  }
  return errors
}
/** Compatibility for API mock/tests; UI stores issue codes and translates at render. */
export function validateInput(
  input: InputValues,
  fields: SchemaField[]
): Record<string, string> {
  return Object.fromEntries(
    Object.entries(validateInputIssues(input, fields)).map(([id, issue]) => {
      const message =
        issue.code === 'required'
          ? `${issue.label} is required.`
          : issue.code === 'format'
            ? (issue.hint ?? 'Check the format.')
            : issue.code === 'maxLength'
              ? `Use at most ${issue.maximum} characters.`
              : issue.code === 'money'
                ? 'Enter a non-negative whole VND amount (up to 15 digits).'
                : issue.code === 'year'
                  ? 'Enter a four-digit tax year.'
                  : 'Enter a valid date.'
      return [id, message]
    })
  )
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
