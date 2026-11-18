import type { SchemaField } from '../../drafting/types/index.ts'
import type { QuickField } from './quickFields.ts'

/** A .docx body in reading order: a paragraph's text, or a table as rows of cells of paragraph texts */
export type DocxBlock = string | string[][][]

export type Anchor = NonNullable<SchemaField['anchor']>

export type FoundField = QuickField & { anchor: Anchor }

const DOTS = /\.{3,}|…/
// A coded item opens a line or stands apart; "chỉ tiêu [04] được..." inside a sentence is a note, not a blank
const CODE = /(?:^|\s{2,})\[(\d+[a-z]?)\]\s*([^:[\]…]*?)\s*(?=:|\.{2,}|…|\s{2,}\[|$)/gi
const PLACEHOLDER = /\{\{\s*([^{}]+?)\s*\}\}/g
const LABEL_DOTS = /(?:^|[,;]\s*)([^:[\]…,;.]{2,60}?)\s*:\s*(?:\.{3,}|…)/g
const DATE_LINE = /ngày\s*(?:\.{2,}|…)+\s*tháng/i
const ROMAN = /^[IVX]+\.?$/
const CELL_CODE = /^\[\d+[a-z]?\]$/i
const NUMBERING = /^\(\d+\)$/

/** Guesses the input type from a Vietnamese tax-form label */
export const typeOf = (label: string): SchemaField['type'] =>
  /ngày/i.test(label)
    ? 'date'
    : /^(\[\w+\]\s*)?(năm|kỳ tính thuế)/i.test(label)
      ? 'year'
      : /số tiền|s[ốỗ] lỗ|doanh thu|thu nhập|chi phí|tiền thuế|thuế phải nộp|tổng cộng/i.test(
            label
          )
        ? 'money'
        : 'text'

const sentence = (s: string) => s.charAt(0) + s.slice(1).toLowerCase()
const isCaps = (s: string) => s === s.toUpperCase() && s !== s.toLowerCase()

/**
 * Finds the blanks of a form: `{{label}}` placeholders, coded items such as "[01] Kỳ tính thuế:....",
 * "Label: ......" lines, a "ngày ... tháng" signing date, and in a table with a header row the empty
 * input rows (one field per column and row), the coded total cells and the I/II section rows as groups.
 * Fields come out not required; the admin reviews them before adding.
 */
export function fieldsFromDocx(blocks: DocxBlock[]): FoundField[] {
  const out: FoundField[] = []
  const seen = new Set<string>()
  const add = (group: string, label: string, anchor: Anchor) => {
    const key = label.toLowerCase()
    if (!label || seen.has(key)) return
    seen.add(key)
    out.push({ group, label, type: typeOf(label), required: false, anchor })
  }
  const fromText = (group: string, text: string, at: Anchor) => {
    for (const [find, label] of text.matchAll(PLACEHOLDER))
      add(group, label, { ...at, find })
    for (const [, code, label] of text.matchAll(CODE))
      add(group, `[${code}] ${label}`.trim(), { ...at, find: `[${code}]` })
    for (const [, label] of text.replace(CODE, '').matchAll(LABEL_DOTS))
      add(group, label.trim(), { ...at, find: label.trim() })
    if (DATE_LINE.test(text)) add(group, 'Ngày ký', { ...at, find: 'ngày' })
  }
  const base = 'Thông tin chung'

  blocks.forEach((block, b) => {
    if (typeof block === 'string') return fromText(base, block, { block: b })
    const rows = block.map((r) => r.map((c) => c.join(' ').trim()))
    const header = rows[0] ?? []
    // A data table: a full header row over three or more columns; anything else (a signing box) is read cell by cell
    if (header.length < 3 || header.some((c) => !c)) {
      block.forEach((row, ri) =>
        row.forEach((cell, ci) => {
          let group = base
          cell.forEach((p, pi) => {
            if (isCaps(p) && !DOTS.test(p)) group = sentence(p)
            else fromText(group, p, { block: b, cell: [ri, ci], p: pi })
          })
        })
      )
      return
    }
    let group = base
    let section = ''
    let n = 0
    rows.forEach((r, ri) => {
      if (ri === 0) return
      const filled = r.filter(Boolean)
      if (r.some((c) => NUMBERING.test(c))) return
      if (ROMAN.test(r[0]) && filled.length === 2) {
        section = r[0].replace('.', '')
        group = `${section}. ${r[1]}`
        n = 0
        return
      }
      const code = r.find((c) => CELL_CODE.test(c))
      if (code) {
        const ci = r.indexOf(code)
        add(group, `${code} ${filled.find((c) => c !== code) ?? header[ci]}`, {
          block: b,
          cell: [ri, ci],
          find: code,
        })
        return
      }
      // "…" alone marks that more rows may follow
      if (!filled.length || filled.every((c) => /^(…|\.{3,})$/.test(c))) return
      if (filled.length === r.length) return
      n++
      const kind = /^năm/i.test(filled[0]) ? 'năm' : 'dòng'
      const tag = [section, `${kind} ${n}`].filter(Boolean).join(', ')
      r.forEach((c, i) => {
        if (i === 0 && /^stt$/i.test(header[0])) return
        if (!c || DOTS.test(c))
          add(group, `${header[i]} (${tag})`, { block: b, cell: [ri, i] })
      })
    })
  })
  return out
}

const RUN = /[.…]{2,}|…/g

/**
 * Where a value goes in a text: the `{{…}}` placeholder itself, else the dot runs after `find`
 * (one per part, e.g. day, month, year), else the end of the text. Ranges are [start, end).
 */
export function fillRanges(
  text: string,
  find = '',
  parts = 1
): [number, number][] {
  const at = find ? text.toLowerCase().indexOf(find.toLowerCase()) : 0
  if (at < 0) return [[text.length, text.length]]
  if (find.startsWith('{{')) return [[at, at + find.length]]
  const from = at + find.length
  const runs = [...text.slice(from).matchAll(RUN)]
    .slice(0, parts)
    .map((m): [number, number] => [from + m.index, from + m.index + m[0].length])
  return runs.length ? runs : [[text.length, text.length]]
}
