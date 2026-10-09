import { useLayoutEffect, useRef } from 'react'

export function useWizardMotion(step: number, visible: boolean) {
  const bodyRef = useRef<HTMLDivElement>(null)
  const previousStep = useRef(step)
  useLayoutEffect(() => {
    const body = bodyRef.current
    const direction = step < previousStep.current ? -1 : 1
    previousStep.current = step
    if (!visible || !body || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const animation = body.animate([
      { opacity: .35, transform: `translateX(${direction * 24}px)` },
      { opacity: 1, transform: 'translateX(0)' },
    ], { duration: 350, easing: 'cubic-bezier(.16, 1, .3, 1)' })
    return () => animation.cancel()
  }, [step, visible])
  return bodyRef
}
