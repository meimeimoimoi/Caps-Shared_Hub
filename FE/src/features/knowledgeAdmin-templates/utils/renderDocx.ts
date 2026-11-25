import { fillRanges, type Anchor, type DocxBlock } from './docxFields'

/** Lays a .docx out as HTML pages in a detached element; the renderer is loaded on first use */
export async function renderDocx(file: File) {
  const { renderAsync } = await import('docx-preview')
  const target = document.createElement('div')
  await renderAsync(file, target, undefined, { inWrapper: false })
  return target
}

const blockEls = (root: Element) => [
  ...root.querySelectorAll('article > p, article > table'),
]
const rowsOf = (table: Element) => [
  ...table.querySelectorAll(':scope > tbody > tr, :scope > tr'),
]
const cellsOf = (row: Element) => [...row.querySelectorAll(':scope > td')]

const texts = (cell: Element) => {
  const ps = [...cell.querySelectorAll('p')]
  return (ps.length ? ps : [cell]).map((p) => (p.textContent ?? '').trim())
}

/** The rendered body in reading order: top-level paragraphs and tables (cells as their paragraph texts) */
export const docxBlocks = (root: HTMLElement): DocxBlock[] =>
  blockEls(root).map((el) =>
    el.tagName === 'TABLE'
      ? rowsOf(el).map((tr) => cellsOf(tr).map(texts))
      : (el.textContent ?? '').trim()
  )

/** A value to show at a field's place in the file; several parts fill successive blanks (day, month, year) */
export type Fill = {
  anchor: Anchor
  label: string
  text: string | string[]
  /** The field the value belongs to, for blanks the user types into */
  id?: string
}

/** The text of each blank a fill found: one part per blank, or all parts in one when the file has fewer blanks */
export const blankTexts = (f: Fill, blanks: number) => {
  const parts = Array.isArray(f.text) ? f.text : [f.text]
  return blanks < parts.length ? [parts.filter(Boolean).join('/')] : parts
}

const locate = (root: Element, a: Anchor) => {
  let el: Element | undefined = blockEls(root)[a.block]
  if (el && a.cell) {
    const row = rowsOf(el)[a.cell[0]]
    el = row && cellsOf(row)[a.cell[1]]
    // A cell's own text sits in its paragraph; writing there keeps the cell's font and alignment
    if (el) el = el.querySelectorAll('p')[a.p ?? 0] ?? el
  }
  return el
}

// Swaps the characters [start, end) of an element's text for a node, across the spans Word splits text into
function put(el: Element, [start, end]: [number, number], node: Element) {
  const full = el.textContent ?? ''
  const nodes: Node[] =
    start > 0 && !/\s/.test(full[start - 1])
      ? [document.createTextNode(' '), node]
      : [node]
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT)
  const list: Text[] = []
  for (let t = walker.nextNode(); t; t = walker.nextNode()) list.push(t as Text)
  let pos = 0
  let placed = false
  for (const t of list) {
    const len = t.data.length
    const s = start - pos
    const e = end - pos
    pos += len
    if (!placed && s >= 0 && s <= len) {
      const rest = t.splitText(s)
      rest.data = rest.data.slice(Math.min(e, len) - s)
      rest.before(...nodes)
      placed = true
    } else if (placed && s < 0 && e > 0) {
      t.data = t.data.slice(Math.min(e, len))
    }
  }
  if (!placed) el.append(...nodes)
}

const mark = (text: string, label: string, fill: number) => {
  const m = document.createElement('mark')
  m.dataset.fill = String(fill)
  m.textContent = text
  m.title = label
  m.className = 'bg-accent-soft text-fg-strong rounded-sm px-0.5'
  return m
}

// An input in place of the blank [start, end); `el` must be on the page so the dots it replaces can be measured
function putInput(
  el: Element,
  range: [number, number],
  fill: number,
  label: string
) {
  const dots = document.createElement('span')
  dots.textContent = (el.textContent ?? '').slice(...range)
  put(el, range, dots)
  const input = document.createElement('input')
  input.dataset.fill = String(fill)
  input.title = label
  input.setAttribute('aria-label', label)
  // As wide as its dots so the page keeps the file's layout; it grows with a longer value where browsers can
  input.size = 1
  input.style.minWidth = `${Math.max(dots.getBoundingClientRect().width, 32)}px`
  input.className =
    'bg-accent-soft text-fg-strong focus:outline-accent field-sizing-content max-w-full rounded-sm border-b border-dotted border-current px-0.5 focus:outline-2 disabled:opacity-70 print:bg-transparent'
  dots.replaceWith(input)
}

/**
 * Writes each value into its blank in a rendered copy of the file, highlighted, with the field name on hover.
 * Each blank carries `data-fill` = the fill's index. With `editable`, it gets an empty input instead; the caller sets values.
 */
export function fillDocx(root: HTMLElement, fills: Fill[], editable = false) {
  fills.forEach((f, i) => {
    const el = locate(root, f.anchor)
    if (!el) return
    const parts = Array.isArray(f.text) ? f.text : [f.text]
    let ranges = fillRanges(el.textContent ?? '', f.anchor.find, parts.length)
    if (ranges.length < parts.length) ranges = ranges.slice(0, 1)
    const values = blankTexts(f, ranges.length)
    // Last blank first, so the earlier offsets stay valid
    for (let j = ranges.length - 1; j >= 0; j--)
      if (editable) putInput(el, ranges[j], i, f.label)
      else put(el, ranges[j], mark(values[j], f.label, i))
  })
}
