import { useEffect, useRef, useState } from 'react'
import { fillDocx, renderDocx, type Fill } from '../utils/renderDocx'

/**
 * Renders a .docx as Word lays it out (pages, tables, boxes), scaled down to fit the panel, with `fills`
 * written into their blanks. The file renders once; each change of the values refills a fresh copy.
 */
export function DocxPreview({ file, fills = [] }: { file: File; fills?: Fill[] }) {
  const ref = useRef<HTMLDivElement>(null)
  const [doc, setDoc] = useState<{ file: File; root: HTMLElement } | null>(null)
  const [failed, setFailed] = useState<File | null>(null)
  const ready = doc?.file === file
  // The page passes a new array on every keystroke; refill only when the values really change
  const fillKey = JSON.stringify(fills)

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
    fillDocx(copy, JSON.parse(fillKey) as Fill[])
    box.replaceChildren(copy)
    // Word pages keep their real width; shrink the whole document so a page fits the panel
    const page = copy.querySelector<HTMLElement>('section')
    if (page?.offsetWidth)
      copy.style.zoom = String(Math.min(1, box.clientWidth / page.offsetWidth))
  }, [doc, file, fillKey])

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
      className="bg-sunken rounded-surface min-h-40 overflow-auto [&_section]:mx-auto [&_section]:mb-3 [&_section]:shadow-md"
    >
      {!ready && <p className="text-fg-muted p-4 text-sm">Đang mở file…</p>}
      <div ref={ref} />
    </div>
  )
}
