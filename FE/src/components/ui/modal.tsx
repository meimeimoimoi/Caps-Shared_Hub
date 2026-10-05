import { useEffect, useId, useRef, type ReactNode } from 'react'
import { X } from 'lucide-react'

interface ModalProps {
  title: ReactNode
  description?: ReactNode
  children?: ReactNode
  footer: ReactNode
  onClose: () => void
  /** Có thì nội dung bọc trong <form>; nút submit trong footer sẽ gọi hàm này */
  onSubmit?: () => void
}

/* Native <dialog>: trình duyệt lo focus trap, phím Esc và backdrop.
 * Mount = mở, unmount = đóng. */
export function Modal({
  title,
  description,
  children,
  footer,
  onClose,
  onSubmit,
}: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()

  useEffect(() => {
    ref.current?.showModal()
  }, [])

  const body = (
    <>
      <div className="p-5 md:p-6">
        <div className="flex items-start justify-between gap-4">
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
        {description && <p className="mt-2">{description}</p>}
        {children}
      </div>
      <div className="border-border flex justify-end gap-2 border-t px-5 py-4 md:px-6">
        {footer}
      </div>
    </>
  )

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      aria-labelledby={titleId}
      className="bg-paper border-hairline rounded-overlay shadow-overlay text-fg backdrop:bg-ink/40 m-auto max-h-[calc(100dvh-32px)] w-[calc(100%-32px)] max-w-lg border p-0"
    >
      {onSubmit ? (
        <form
          onSubmit={(e) => {
            e.preventDefault()
            onSubmit()
          }}
        >
          {body}
        </form>
      ) : (
        body
      )}
    </dialog>
  )
}
