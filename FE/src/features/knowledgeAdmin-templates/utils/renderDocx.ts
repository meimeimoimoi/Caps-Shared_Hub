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
export type Fill = { anchor: Anchor; label: string; text: string | string[] }

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

// Swaps the characters [start, end) of an element's text for a marked value, across the spans Word splits text into
function put(el: Element, [start, end]: [number, number], value: string, label: string) {
  const mark = document.createElement('mark')
  mark.textContent = value
  mark.title = label
  mark.className = 'bg-accent-soft text-fg-strong rounded-sm px-0.5'
  const full = el.textContent ?? ''
  const nodes: Node[] =
    start > 0 && !/\s/.test(full[start - 1])
      ? [document.createTextNode(' '), mark]
      : [mark]
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

/** Writes each value into its blank in a rendered copy of the file, highlighted, with the field name on hover */
export function fillDocx(root: HTMLElement, fills: Fill[]) {
  for (const f of fills) {
    const el = locate(root, f.anchor)
    if (!el) continue
    const parts = Array.isArray(f.text) ? f.text : [f.text]
    let ranges = fillRanges(el.textContent ?? '', f.anchor.find, parts.length)
    let values = parts
    if (ranges.length < parts.length) {
      ranges = ranges.slice(0, 1)
      values = [parts.join('/')]
    }
    // Last blank first, so the earlier offsets stay valid
    for (let i = ranges.length - 1; i >= 0; i--)
      put(el, ranges[i], values[i], f.label)
  }
}
