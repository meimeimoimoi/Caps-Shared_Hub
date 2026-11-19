import type { InputValues, SchemaField } from '../types/index.ts'
import { isAnchor } from './schemaFields.ts'

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/

/**
 * The values a user typed, each placed at its blank in the template's .docx: a date fills the day, month and
 * year blanks, an amount shows grouped. Empty fields and fields without a valid anchor keep their dots.
 */
export function docxValues(
  fields: SchemaField[],
  input: InputValues,
  money: (value: bigint) => string
) {
  return fields.flatMap((f) => {
    const value = input[f.id]?.trim()
    if (!value || !isAnchor(f.anchor)) return []
    const date = f.type === 'date' ? ISO_DATE.exec(value) : null
    const text = date
      ? [date[3], date[2], date[1]]
      : f.type === 'money' && /^\d+$/.test(value)
        ? money(BigInt(value))
        : value
    return [{ anchor: f.anchor, label: f.label, text }]
  })
}
