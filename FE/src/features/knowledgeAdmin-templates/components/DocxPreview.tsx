import {
  useEffect,
  useRef,
  useState,
  type FocusEvent,
  type FormEvent,
} from 'react'
import {
  blankTexts,
  fillDocx,
  renderDocx,
  type Fill,
} from '../utils/renderDocx'

const inputsOf = (box: Element, fill: number) => [
  ...box.querySelectorAll<HTMLInputElement>(`input[data-fill="${fill}"]`),
]

// Shows a fill's value in its inputs, except `keep` (the one being typed in, so the caret does not jump)
const writeFill = (
  box: Element,
  fill: Fill,
  i: number,
  keep?: Element | null
) => {
  const inputs = inputsOf(box, i)
  const texts = blankTexts(fill, inputs.length)
  for (const [j, input] of inputs.entries())
    if (input !== keep) input.value = texts[j] ?? ''
}

// Marks the blank of the field being edited
const FOCUS = ['outline-3', 'outline-offset-2', 'outline-accent']

// The nearest box that scrolls; never the page itself, so the form being typed in stays where it is
const scrollParent = (el: HTMLElement) => {
  for (let p = el.parentElement; p && p !== document.body; p = p.parentElement)
    if (
      /auto|scroll/.test(getComputedStyle(p).overflowY) &&
      p.scrollHeight > p.clientHeight
    )
      return p
  return null
}

/**
 * Renders a .docx as Word lays it out (pages, tables, boxes), scaled down to fit the panel, with `fills`
 * written into their blanks. The file renders once; each change of the values refills a fresh copy.
 * With `onEdit`, each blank is an input instead: typing there reports the fill and the text of all its blanks.
 * `focusId` outlines the blanks of the fill with that id and scrolls them into view inside their panel.
 */
export function DocxPreview({
  file,
  fills = [],
  onEdit,
  focusId,
}: {
  file: File
  fills?: Fill[]
  onEdit?: (fill: Fill, parts: string[]) => void
  focusId?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [doc, setDoc] = useState<{ file: File; root: HTMLElement } | null>(null)
  const [failed, setFailed] = useState<File | null>(null)
  const ready = doc?.file === file
  const editable = Boolean(onEdit)
  // The page passes a new array on every keystroke; refill only when the values really change
  const fillKey = JSON.stringify(fills)
  // Inputs stay in place while the user types; only a change of the blanks themselves lays them out again
  const layoutKey = editable
    ? JSON.stringify(
        fills.map((f) => ({
          ...f,
          text: Array.isArray(f.text) ? f.text.map(() => '') : '',
        }))
      )
    : fillKey

  useEffect(() => {
    let cancelled = false
    renderDocx(file)
      .then((root) => !cancelled && setDoc({ file, root }))
      .catch((error: unknown) => {
        console.error('docx preview failed', error)
        if (!cancelled) setFailed(file)
      })
    return () => {
      cancelled = true
    }
  }, [file])

  useEffect(() => {
    const box = ref.current
    if (!box || !doc || doc.file !== file) return
    const copy = doc.root.cloneNode(true) as HTMLElement
    // On the page before filling: an input measures the dots it replaces
    box.replaceChildren(copy)
    fillDocx(copy, JSON.parse(layoutKey) as Fill[], editable)
    // Word pages keep their real width; shrink the whole document so a page fits the panel
    const page = copy.querySelector<HTMLElement>('section')
    if (page?.offsetWidth)
      copy.style.zoom = String(Math.min(1, box.clientWidth / page.offsetWidth))
  }, [doc, file, layoutKey, editable])

  useEffect(() => {
    const box = ref.current
    if (!box || !editable) return
    ;(JSON.parse(fillKey) as Fill[]).forEach((fill, i) =>
      writeFill(box, fill, i, document.activeElement)
    )
  }, [doc, layoutKey, fillKey, editable])

  useEffect(() => {
    const box = ref.current
    if (!box || focusId === undefined) return
    const at = String(
      (JSON.parse(fillKey) as Fill[]).findIndex((f) => f.id === focusId)
    )
    const blanks = [...box.querySelectorAll<HTMLElement>('[data-fill]')]
    for (const el of blanks)
      for (const c of FOCUS) el.classList.toggle(c, el.dataset.fill === at)
    const target = blanks.find((el) => el.dataset.fill === at)
    const scroller = target && scrollParent(target)
    if (!target || !scroller) return
    const offset =
      target.getBoundingClientRect().top - scroller.getBoundingClientRect().top
    scroller.scrollBy({
      top: offset - scroller.clientHeight / 2,
      behavior: matchMedia('(prefers-reduced-motion: reduce)').matches
        ? 'auto'
        : 'smooth',
    })
  }, [doc, layoutKey, fillKey, focusId])

  const edit = (event: FormEvent<HTMLDivElement>) => {
    const i = (event.target as HTMLElement).dataset.fill
    const fill = i === undefined ? undefined : fills[Number(i)]
    if (onEdit && fill)
      onEdit(
        fill,
        inputsOf(event.currentTarget, Number(i)).map((input) => input.value)
      )
  }

  // Leaving a field shows what the form kept: an amount grouped, a date left half-typed back to the last full one
  const leave = (event: FocusEvent<HTMLDivElement>) => {
    const i = (event.target as HTMLElement).dataset.fill
    const next = (event.relatedTarget as HTMLElement | null)?.dataset?.fill
    if (i !== undefined && i !== next && fills[Number(i)])
      writeFill(event.currentTarget, fills[Number(i)], Number(i))
  }

  if (failed === file)
    return (
      <p role="alert" className="text-danger text-sm">
        Không mở được bản xem trước của file này. Tải lại trang rồi chọn lại
        file; nếu vẫn lỗi, mở file bằng Word và lưu lại dạng .docx.
      </p>
    )
  return (
    <div
      aria-label={`Nội dung ${file.name}`}
      onInput={editable ? edit : undefined}
      onBlur={editable ? leave : undefined}
      // Word pages stay paper in dark mode: white page, black text, light highlights
      className="bg-sunken rounded-surface min-h-40 overflow-auto [&_input]:bg-[#ffedd5] [&_input]:text-black [&_mark]:bg-[#ffedd5] [&_mark]:text-black [&_section]:mx-auto [&_section]:mb-3 [&_section]:bg-white [&_section]:text-black [&_section]:shadow-md"
    >
      {!ready && <p className="text-fg-muted p-4 text-sm">Đang mở file…</p>}
      <div ref={ref} />
    </div>
  )
}
