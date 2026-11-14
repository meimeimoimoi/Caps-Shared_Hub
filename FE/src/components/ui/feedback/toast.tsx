import { useEffect, useRef } from 'react'
import { AlertTriangle, Check } from 'lucide-react'
import { useMotion } from '@/components/ui/motion'
import type { ToastContent } from './toast-content'

interface ToastProps {
  message: ToastContent
  onDone: () => void
  duration?: number
}

/* One toast at a time; hides itself after `duration` ms (errors stay longer).
 * Shown as a manual popover so it sits in the top layer, above an open <dialog>
 * instead of dimmed and inert behind its backdrop. */
export function Toast({ message, onDone, duration = 4000 }: ToastProps) {
  const error = typeof message !== 'string'
  const text = typeof message === 'string' ? message : message.text
  const popover = useRef<HTMLDivElement>(null)
  const motion = useMotion({ preset: 'reveal', replayKey: text })

  useEffect(() => {
    const el = popover.current
    if (!el || typeof el.showPopover !== 'function') return
    if (!el.matches(':popover-open')) el.showPopover()
    return () => {
      if (el.matches(':popover-open')) el.hidePopover()
    }
  }, [])

  useEffect(() => {
    const t = setTimeout(onDone, error ? duration * 2 : duration)
    return () => clearTimeout(t)
  }, [text, error, onDone, duration])

  return (
    <div
      ref={popover}
      popover="manual"
      className="inset-auto right-4 bottom-4 m-0 overflow-visible border-0 bg-transparent p-0 md:right-6 md:bottom-6"
    >
      <div
        ref={motion}
        role={error ? 'alert' : 'status'}
        className={`rounded-overlay shadow-overlay flex items-center gap-2 px-4 py-3 text-sm font-semibold ${error ? 'bg-danger text-paper' : 'bg-ink text-paper'}`}
      >
        {error ? (
          <AlertTriangle size={16} aria-hidden="true" />
        ) : (
          <Check size={16} aria-hidden="true" />
        )}
        {text}
      </div>
    </div>
  )
}
