import { useEffect, useRef, useState } from 'react'
import { AlertTriangle, Check, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useMotion } from '@/components/ui/motion'
import type { ToastContent } from './toast-content'

interface ToastProps {
  message: ToastContent
  onDone: () => void
  duration?: number
}

/* One toast at a time. A success hides itself after `duration` ms, pausing while
 * hovered or focused; an error stays until dismissed (WCAG 2.2.1). Shown as a
 * manual popover so it sits in the top layer, above an open <dialog> instead of
 * dimmed and inert behind its backdrop. */
export function Toast({ message, onDone, duration = 4000 }: ToastProps) {
  const { t } = useTranslation('common')
  const error = typeof message !== 'string'
  const text = typeof message === 'string' ? message : message.text
  const popover = useRef<HTMLDivElement>(null)
  const motion = useMotion({ preset: 'reveal', replayKey: text })
  const [hovered, setHovered] = useState(false)
  const [focused, setFocused] = useState(false)
  const paused = hovered || focused

  useEffect(() => {
    const el = popover.current
    if (!el || typeof el.showPopover !== 'function') return
    if (!el.matches(':popover-open')) el.showPopover()
    return () => {
      if (el.matches(':popover-open')) el.hidePopover()
    }
  }, [])

  useEffect(() => {
    if (error || paused) return
    const timer = setTimeout(onDone, duration)
    return () => clearTimeout(timer)
  }, [text, error, paused, onDone, duration])

  return (
    <div
      ref={popover}
      popover="manual"
      className="inset-auto right-4 bottom-4 m-0 overflow-visible border-0 bg-transparent p-0 md:right-6 md:bottom-6"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
    >
      <div
        ref={motion}
        role={error ? 'alert' : 'status'}
        className={`rounded-overlay shadow-overlay flex max-w-[min(32rem,calc(100vw-2rem))] items-center gap-2 py-2 pr-2 pl-4 text-sm font-semibold ${error ? 'bg-danger text-paper' : 'bg-ink text-paper'}`}
      >
        {error ? (
          <AlertTriangle size={16} aria-hidden="true" className="shrink-0" />
        ) : (
          <Check size={16} aria-hidden="true" className="shrink-0" />
        )}
        <span className="min-w-0 flex-1 py-1">{text}</span>
        <button
          type="button"
          onClick={onDone}
          aria-label={t('actions.close')}
          className="focus-visible:outline-paper inline-flex size-8 shrink-0 items-center justify-center rounded-md hover:bg-white/15 focus-visible:outline-2 focus-visible:outline-offset-[-2px]"
        >
          <X size={16} aria-hidden="true" />
        </button>
      </div>
    </div>
  )
}
