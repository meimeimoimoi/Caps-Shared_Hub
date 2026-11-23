import { useEffect, useRef } from 'react'

/** Pointer feedback stays out of React's render cycle and never moves inputs. */
export function useRegistrationMotion() {
  const rootRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    const media = window.matchMedia('(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)')
    let frame = 0
    let activeButton: HTMLElement | null = null
    const clearButton = () => {
      activeButton?.removeAttribute('data-pointer-lit')
      activeButton = null
    }
    const reset = () => {
      cancelAnimationFrame(frame)
      root.removeAttribute('data-pointer-active')
      clearButton()
    }
    const move = (event: PointerEvent) => {
      if (!media.matches || event.pointerType === 'touch') return
      const rect = root.getBoundingClientRect()
      const x = (event.clientX - rect.left) / rect.width
      const y = (event.clientY - rect.top) / rect.height
      const button = event.target instanceof Element
        ? event.target.closest<HTMLElement>('.expert-submit-btn, .expert-footer-continue') : null
      if (button !== activeButton) { clearButton(); activeButton = button }
      const buttonRect = button?.getBoundingClientRect()
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        root.dataset.pointerActive = 'true'
        root.style.setProperty('--ambient-x', `${x * 100}%`)
        root.style.setProperty('--ambient-y', `${y * 100}%`)
        if (button && buttonRect) {
          button.dataset.pointerLit = 'true'
          button.style.setProperty('--button-x', `${(event.clientX - buttonRect.left) / buttonRect.width * 100}%`)
          button.style.setProperty('--button-y', `${(event.clientY - buttonRect.top) / buttonRect.height * 100}%`)
        }
      })
    }
    root.addEventListener('pointermove', move)
    root.addEventListener('pointerleave', reset)
    window.addEventListener('blur', reset)
    media.addEventListener('change', reset)
    return () => {
      reset()
      root.removeEventListener('pointermove', move)
      root.removeEventListener('pointerleave', reset)
      window.removeEventListener('blur', reset)
      media.removeEventListener('change', reset)
    }
  }, [])
  return rootRef
}
