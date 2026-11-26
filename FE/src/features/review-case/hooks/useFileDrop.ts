import { useState, type DragEvent } from 'react'

/** Drop target for a file picker: files dropped on it go to onFiles; `over` lights it up while dragging. */
export function useFileDrop(onFiles: (files: File[]) => void, disabled = false) {
  const [over, setOver] = useState(false)
  // Both enter and over must be cancelled for the element to count as a drop target in every browser
  const accept = (e: DragEvent) => {
    if (disabled) return
    // Without preventDefault the browser opens the dropped file instead
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
    setOver(true)
  }
  return {
    over,
    props: {
      onDragEnter: accept,
      onDragOver: accept,
      // Moving onto the icon or the text inside is not leaving the target
      onDragLeave: (e: DragEvent) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setOver(false)
      },
      onDrop: (e: DragEvent) => {
        e.preventDefault()
        setOver(false)
        if (!disabled) onFiles(Array.from(e.dataTransfer.files))
      },
    },
  }
}
