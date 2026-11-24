import type { SchemaField } from '../../drafting/types/index.ts'

// What a preview writes into each blank, so the admin sees which field lands where
const sampleValue = (f: Pick<SchemaField, 'label' | 'type'>) =>
  f.type === 'money'
    ? '1.000.000'
    : f.type === 'year'
      ? '2025'
      : f.type === 'date'
        ? ['01', '01', '2026']
        : f.label.replace(/^\[\w+\]\s*/, '')

/** A sample value at the place of each field that knows where it sits in the template's .docx */
export const sampleFills = (fields: SchemaField[]) =>
  fields.flatMap((f) =>
    f.anchor
      ? [{ id: f.id, anchor: f.anchor, label: f.label, text: sampleValue(f) }]
      : []
  )
