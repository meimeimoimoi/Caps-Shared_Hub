import { useEffect, useId, useRef, type ReactNode } from 'react'
import { CircleHelp } from 'lucide-react'
import { animateElement } from '@/components/ui/motion/animate'
import { motionTokens } from '@/components/ui/motion/tokens'

export interface HelpTipProps {
  label: string
  children: ReactNode
  className?: string
}

/**
 * A disclosure: works with keyboard, touch and without hover. Closes on Escape or a click outside,
 * and positions the explanation within the viewport next to its label.
 */
export function HelpTip({ label, children, className = '' }: HelpTipProps) {
  const id = useId()
  const ref = useRef<HTMLDetailsElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const cancelAnimation = useRef<(() => void) | null>(null)

  const togglePanel = () => {
    const panel = panelRef.current
    if (!panel) return
    cancelAnimation.current?.()
    cancelAnimation.current = null
    if (ref.current?.open) {
      // The top layer keeps viewport coordinates independent of transformed ancestors.
      if (!panel.matches(':popover-open')) panel.showPopover()
      positionPanel()
      if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        const direction = panel.dataset.placement === 'above' ? 1 : -1
        cancelAnimation.current = animateElement(
          panel,
          [
            {
              opacity: 0,
              transform: `translateY(${direction * motionTokens.distance.popover}px) scale(${motionTokens.scale.popover})`,
            },
            { opacity: 1, transform: 'none' },
          ],
          {
            duration: motionTokens.duration.feedback,
            easing: motionTokens.easing.enter,
          }
        )
      }
    } else {
      panel.hidePopover()
    }
  }

  const positionPanel = () => {
    const details = ref.current
    const panel = panelRef.current
    if (!details?.open || !panel) return
    const trigger = details.querySelector('summary')!.getBoundingClientRect()
    const margin = 12
    const gap = 8
    panel.style.maxHeight = ''
    const height = panel.offsetHeight
    const below = window.innerHeight - trigger.bottom - gap - margin
    const above = trigger.top - gap - margin
    const openAbove = height > below && above > below
    panel.dataset.placement = openAbove ? 'above' : 'below'
    panel.style.transformOrigin = openAbove ? 'bottom left' : 'top left'
    panel.style.maxHeight = `${Math.max(0, openAbove ? above : below)}px`
    panel.style.left = `${Math.max(margin, Math.min(trigger.left, window.innerWidth - panel.offsetWidth - margin))}px`
    panel.style.top = `${openAbove ? Math.max(margin, trigger.top - gap - Math.min(height, above)) : trigger.bottom + gap}px`
  }

  useEffect(() => {
    const details = ref.current
    if (!details) return
    const close = (e: Event) => {
      if (!details.open) return
      if (e instanceof KeyboardEvent) {
        if (e.key !== 'Escape') return
        details.open = false
        details.querySelector('summary')?.focus()
        return
      }
      if (!details.contains(e.target as Node)) details.open = false
    }
    document.addEventListener('pointerdown', close)
    document.addEventListener('keydown', close)
    window.addEventListener('resize', positionPanel)
    document.addEventListener('scroll', positionPanel, true)
    return () => {
      cancelAnimation.current?.()
      document.removeEventListener('pointerdown', close)
      document.removeEventListener('keydown', close)
      window.removeEventListener('resize', positionPanel)
      document.removeEventListener('scroll', positionPanel, true)
    }
  }, [])

  return (
    <details
      ref={ref}
      onToggle={togglePanel}
      className={`group relative shrink-0 ${className}`}
    >
      <summary
        aria-label={label}
        aria-controls={id}
        className="!text-ex-muted hover:!text-accent-text group-open:!text-accent-text hover:bg-accent-soft group-open:bg-accent-soft hover:border-border-subtle group-open:border-border-subtle focus-visible:outline-accent !flex size-7 cursor-pointer items-center justify-center rounded-full border border-transparent !p-0 !no-underline transition-colors duration-150 marker:hidden focus-visible:outline-2 focus-visible:outline-offset-2 motion-reduce:transition-none [&::-webkit-details-marker]:hidden [@media(pointer:coarse)]:size-10"
      >
        <CircleHelp size={16} aria-hidden="true" />
      </summary>
      <div
        id={id}
        ref={panelRef}
        popover="manual"
        role="region"
        aria-labelledby={`${id}-title`}
        className="border-border bg-surface text-fg shadow-overlay rounded-overlay fixed inset-auto z-50 m-0 w-80 max-w-[calc(100vw-1.5rem)] overflow-y-auto overscroll-contain border p-4 text-left text-[13px] leading-relaxed font-normal whitespace-normal"
      >
        <div className="mb-3 flex items-start gap-2.5">
          <span className="bg-accent-soft text-accent-text flex size-7 shrink-0 items-center justify-center rounded-lg">
            <CircleHelp size={16} aria-hidden="true" />
          </span>
          <span
            id={`${id}-title`}
            className="text-fg-strong min-w-0 pt-0.5 text-sm leading-6 font-semibold break-words"
          >
            {label}
          </span>
        </div>
        <div className="border-border-subtle [&_a]:text-accent-text border-t pt-3 break-words [&_a]:underline [&_a]:underline-offset-2 [&_li+li]:mt-1.5 [&_ol]:list-decimal [&_ol]:pl-4 [&_p+p]:mt-2 [&_ul]:list-disc [&_ul]:pl-4">
          {children}
        </div>
      </div>
    </details>
  )
}
