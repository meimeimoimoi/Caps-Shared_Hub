import { useEffect, useId, useRef, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useDialogMotion } from '@/components/ui/motion'

interface ModalProps {
  bodyClassName?: string
  title: ReactNode
  /** Shown right after the title, e.g. a HelpTip; kept outside the heading element */
  titleAddon?: ReactNode
  description?: ReactNode
  children?: ReactNode
  footer: ReactNode
  onClose: () => void
  /** Có thì nội dung bọc trong <form>; nút submit trong footer sẽ gọi hàm này */
  onSubmit?: () => void
  preventClose?: boolean
  closeLabel?: string
  /** md: hộp thoại xác nhận/biểu mẫu ngắn; lg: nội dung dạng danh sách cần bề ngang */
  size?: 'md' | 'lg'
}

/* Native <dialog>: trình duyệt lo focus trap, phím Esc và backdrop.
 * Mount = mở, unmount = đóng. */
export function Modal({
  bodyClassName = '',
  title,
  titleAddon,
  description,
  children,
  footer,
  onClose,
  onSubmit,
  preventClose = false,
  closeLabel,
  size = 'md',
}: ModalProps) {
  const { t } = useTranslation('common')
  const ref = useRef<HTMLDialogElement>(null)
  useDialogMotion(ref)
  const titleId = useId()

  useEffect(() => {
    const trigger =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null
    ref.current?.showModal()
    // Không có ô autofocus thì focus vào chính hộp thoại, tránh viền focus đậm trên nút Đóng ngay khi mở
    if (!ref.current?.querySelector('[autofocus]')) ref.current?.focus()
    return () => {
      trigger?.focus()
    }
  }, [])

  const body = (
    <>
      <div className={`min-h-0 overflow-y-auto p-5 md:p-6 ${bodyClassName}`}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-center gap-2">
            <h2 id={titleId} className="text-h2">
              {title}
            </h2>
            {titleAddon}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={closeLabel ?? t('actions.close')}
            disabled={preventClose}
            className="btn btn-ghost -mt-1 -mr-2 px-2"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>
        {description && <p className="mt-2">{description}</p>}
        {children}
      </div>
      <div className="border-border flex shrink-0 flex-wrap justify-end gap-2 border-t px-5 py-4 md:px-6">
        {footer}
      </div>
    </>
  )

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onCancel={(event) => {
        event.preventDefault()
        if (!preventClose) onClose()
      }}
      aria-labelledby={titleId}
      tabIndex={-1}
      className={`bg-paper border-hairline rounded-overlay shadow-overlay text-fg backdrop:bg-ink/40 m-auto max-h-[calc(100dvh-32px)] w-[calc(100%-32px)] ${size === 'lg' ? 'max-w-3xl' : 'max-w-lg'} overflow-hidden border p-0 focus:outline-none [&[open]]:flex [&[open]]:flex-col`}
    >
      {onSubmit ? (
        <form
          className="flex min-h-0 flex-col"
          onSubmit={(e) => {
            e.preventDefault()
            onSubmit()
          }}
        >
          {body}
        </form>
      ) : (
        <div className="flex min-h-0 flex-col">{body}</div>
      )}
    </dialog>
  )
}
