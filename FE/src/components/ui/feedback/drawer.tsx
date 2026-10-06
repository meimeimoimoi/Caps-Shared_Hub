import { useEffect, useId, useRef, type ReactNode } from 'react'
import { X } from 'lucide-react'

interface DrawerProps {
  title: ReactNode
  children: ReactNode
  footer?: ReactNode
  onClose: () => void
}

/* Panel trượt từ bên phải. Native <dialog> nên có sẵn focus trap, Esc, backdrop.
 * Mount = mở, unmount = đóng. */
export function Drawer({ title, children, footer, onClose }: DrawerProps) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()

  useEffect(() => {
    ref.current?.showModal()
  }, [])

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      // Bấm vào backdrop (chính phần tử dialog, ngoài nội dung) thì đóng
      onClick={(e) => e.target === e.currentTarget && onClose()}
      aria-labelledby={titleId}
      className="bg-paper shadow-overlay text-fg backdrop:bg-ink/40 m-0 ml-auto h-dvh max-h-dvh w-full max-w-md p-0"
    >
      <div className="flex h-full flex-col">
        <div className="border-border flex items-start justify-between gap-4 border-b px-5 py-4">
          <h2 id={titleId} className="text-h2">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="btn btn-ghost -mt-1 -mr-2 px-2"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && (
          <div className="border-border flex flex-col gap-2 border-t px-5 py-4">
            {footer}
          </div>
        )}
      </div>
    </dialog>
  )
}
