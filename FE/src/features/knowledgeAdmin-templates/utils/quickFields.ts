import type { SchemaField } from '../../drafting/types/index.ts'
import { FIELD_TYPE } from '../constants.ts'

export type QuickField = Omit<SchemaField, 'id'>

const TYPE_BY_NAME = new Map<string, SchemaField['type']>(
  Object.entries(FIELD_TYPE).flatMap(([type, label]) => [
    [type, type as SchemaField['type']],
    [label.toLowerCase(), type as SchemaField['type']],
  ])
)

/** Writes fields back in the quick-entry format, so found fields can be reviewed and edited as text */
export const toQuickText = (fields: QuickField[]) =>
  fields
    .map((f) =>
      [f.group, f.label, FIELD_TYPE[f.type].toLowerCase(), f.required ? '*' : '']
        .map((c) => c.replaceAll('|', '/'))
        .join(' | ')
        .replace(/ \| $/, '')
    )
    .join('\n')

/**
 * Reads one field per line: `group | label | type | *`, columns split by "|" or a tab (an Excel paste).
 * A line with only a label keeps the group of the line before it; the type is a code or its Vietnamese
 * name (unknown means text); "*" marks the field required. Blank lines are skipped.
 */
export function parseQuickFields(text: string, group = ''): QuickField[] {
  const out: QuickField[] = []
  for (const line of text.split(/\r?\n/)) {
    const cols = line.split(/\t|\|/).map((c) => c.trim())
    if (!cols.some(Boolean)) continue
    const [first, label = '', type = '', mark = ''] =
      cols.length === 1 ? ['', cols[0]] : cols
    if (cols.length > 1) group = first
    if (!label) continue
    out.push({
      label,
      group,
      type: TYPE_BY_NAME.get(type.toLowerCase()) ?? 'text',
      required: mark === '*',
    })
  }
  return out
}
