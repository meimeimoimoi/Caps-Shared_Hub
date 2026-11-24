import { useState, type DragEvent } from 'react'

/** Drop target for a file picker: files dropped on it go to onFiles; `over` lights it up while dragging. */
export function useFileDrop(onFiles: (files: File[]) => void, disabled = false) {
  const [over, setOver] = useState(false)
  return {
    over,
    props: {
      onDragOver: (e: DragEvent) => {
        if (disabled) return
        // Without preventDefault the browser opens the dropped file instead
        e.preventDefault()
        setOver(true)
      },
      onDragLeave: () => setOver(false),
      onDrop: (e: DragEvent) => {
        e.preventDefault()
        setOver(false)
        if (!disabled) onFiles(Array.from(e.dataTransfer.files))
      },
    },
  }
}
