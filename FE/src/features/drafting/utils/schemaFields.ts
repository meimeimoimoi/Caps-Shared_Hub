import type { SchemaField } from '../types/index.ts'

const TYPES: readonly SchemaField['type'][] = [
  'text',
  'textarea',
  'money',
  'date',
  'year',
]

/** The field schema stored on a template version (a JSON array of objects) as form fields.
 * The server only checks the array shape, so unknown types fall back to text and a missing id gets one. */
export function toSchemaFields(json: unknown): SchemaField[] {
  if (!Array.isArray(json)) return []
  return json
    .filter(
      (f): f is Record<string, unknown> => typeof f === 'object' && f !== null
    )
    .map((f, i) => {
      const id = typeof f.id === 'string' && f.id ? f.id : `field_${i + 1}`
      const type = TYPES.includes(f.type as SchemaField['type'])
        ? (f.type as SchemaField['type'])
        : 'text'
      return {
        id,
        label: typeof f.label === 'string' && f.label ? f.label : id,
        group: typeof f.group === 'string' ? f.group : '',
        type,
        required: f.required !== false,
        ...(typeof f.hint === 'string' && f.hint ? { hint: f.hint } : {}),
        ...(typeof f.pattern === 'string' ? { pattern: f.pattern } : {}),
        ...(typeof f.maxLength === 'number' ? { maxLength: f.maxLength } : {}),
      }
    })
}
