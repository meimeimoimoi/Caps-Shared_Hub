import type { Language } from '@/lib/i18n/language'
import type { InputValues, SchemaField } from '../types/index.ts'
import { parseMoneyInput } from './moneyInput.ts'
import { isAnchor } from './schemaFields.ts'

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/

/**
 * The values a user typed, each placed at its blank in the template's .docx: a date fills the day, month and
 * year blanks, an amount shows grouped. Empty fields and fields without a valid anchor keep their dots.
 * `editable` keeps the empty fields too, so each anchored field gets a blank to type into.
 */
export function docxValues(
  fields: SchemaField[],
  input: InputValues,
  money: (value: bigint) => string,
  editable = false
) {
  return fields.flatMap((f) => {
    const value = input[f.id]?.trim() ?? ''
    if ((!value && !editable) || !isAnchor(f.anchor)) return []
    const date = f.type === 'date' ? ISO_DATE.exec(value) : null
    const text = date
      ? [date[3], date[2], date[1]]
      : f.type === 'date' && editable
        ? ['', '', '']
        : f.type === 'money' && /^\d+$/.test(value)
          ? money(BigInt(value))
          : value
    return [{ id: f.id, anchor: f.anchor, label: f.label, text }]
  })
}

/**
 * What a user typed into a field's blanks in the template, as the form stores it. A date comes as day, month,
 * year blanks (or one "dd/mm/yyyy" blank) and is null while incomplete, so the form keeps its last full date.
 */
export function fieldValue(
  field: Pick<SchemaField, 'type'>,
  parts: string[],
  language: Language
): string | null {
  if (field.type === 'money') return parseMoneyInput(parts[0] ?? '', language)
  if (field.type !== 'date') return parts[0] ?? ''
  const [d = '', m = '', y = ''] =
    parts.length === 3
      ? parts.map((p) => p.trim())
      : (parts[0] ?? '').trim().split(/\D+/)
  if (!d && !m && !y) return ''
  if (!/^\d{1,2}$/.test(d) || !/^\d{1,2}$/.test(m) || !/^\d{4}$/.test(y))
    return null
  return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
}
