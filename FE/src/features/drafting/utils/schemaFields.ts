import type { SchemaField } from '../types/index.ts'

const TYPES: readonly SchemaField['type'][] = [
  'text',
  'textarea',
  'money',
  'date',
  'year',
]

const isIndex = (n: unknown) => Number.isInteger(n) && (n as number) >= 0

// An anchor from the server is only trusted when its shape is right; a bad one drops, the field stays
const isAnchor = (a: unknown): a is NonNullable<SchemaField['anchor']> => {
  if (typeof a !== 'object' || a === null) return false
  const { block, cell, p, find } = a as Record<string, unknown>
  return (
    isIndex(block) &&
    (cell === undefined ||
      (Array.isArray(cell) && cell.length === 2 && cell.every(isIndex))) &&
    (p === undefined || isIndex(p)) &&
    (find === undefined || typeof find === 'string')
  )
}

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
        ...(isAnchor(f.anchor) ? { anchor: f.anchor } : {}),
      }
    })
}
