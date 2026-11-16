import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
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
  /** md: confirm dialogs/short forms; lg: list-like content needing width; xl: multi-column detail views */
  size?: 'md' | 'lg' | 'xl'
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
  // What opened the dialog, read during the first render: an effect would run again under
  // StrictMode after the dialog already holds focus and record the dialog itself
  const [trigger] = useState(() =>
    document.activeElement instanceof HTMLElement ? document.activeElement : null
  )

  useEffect(() => {
    ref.current?.showModal()
    // Without an autofocus field, focus the dialog itself so the Close button gets no ring on open
    if (!ref.current?.querySelector('[autofocus]')) ref.current?.focus()
    return () => {
      // Hand focus back to what opened the dialog (WCAG 2.4.3). The browser may still move focus
      // to <body> while the open dialog leaves the top layer, so try again on the next frame.
      const restore = () => {
        if (trigger?.isConnected) trigger.focus()
      }
      restore()
      requestAnimationFrame(() => {
        if (!document.activeElement || document.activeElement === document.body)
          restore()
      })
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
      className={`bg-paper border-hairline rounded-overlay shadow-overlay text-fg backdrop:bg-ink/40 m-auto max-h-[calc(100dvh-32px)] w-[calc(100%-32px)] ${size === 'xl' ? 'max-w-4xl' : size === 'lg' ? 'max-w-3xl' : 'max-w-lg'} overflow-hidden border p-0 focus:outline-none [&[open]]:flex [&[open]]:flex-col`}
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
