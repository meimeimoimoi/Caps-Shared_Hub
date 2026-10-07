import {
  createContext,
  useContext,
  useLayoutEffect,
  useRef,
  useSyncExternalStore,
} from 'react'
import { animateElement } from './animate'
import {
  motionDuration,
  motionFrames,
  motionTokens,
  type MotionPreset,
} from './tokens'

export const MotionSequenceContext = createContext(0)
const query = '(prefers-reduced-motion: reduce)'
const subscribe = (callback: () => void) => {
  const media = window.matchMedia(query)
  media.addEventListener('change', callback)
  return () => media.removeEventListener('change', callback)
}
export function useReducedMotion() {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => true
  )
}

export interface MotionOptions {
  preset?: MotionPreset
  duration?: number
  delay?: number
  /** Re-run only when this identity changes, not on ordinary renders. */
  replayKey?: string | number
  /** Animate once when the element reaches the viewport. */
  viewport?: boolean
  disabled?: boolean
  /** Scope animation to content, keeping fixed navigation stationary. */
  targetSelector?: string
}

/** Attach to existing semantic markup (section, tr, header, etc.) without a wrapper. */
export function useMotion<T extends Element = HTMLDivElement>({
  preset = 'reveal',
  duration,
  delay = 0,
  replayKey,
  viewport = false,
  disabled = false,
  targetSelector,
}: MotionOptions = {}) {
  const ref = useRef<T>(null)
  const sequenceDelay = useContext(MotionSequenceContext)
  const reduced = useReducedMotion()
  useLayoutEffect(() => {
    const root = ref.current
    const element =
      (targetSelector ? root?.querySelector(targetSelector) : root) ?? root
    if (!element || disabled) return
    let stop: (() => void) | undefined
    const play = () => {
      stop = animateElement(element, motionFrames(preset, reduced), {
        duration: reduced
          ? motionTokens.duration.reduced
          : Math.max(0, duration ?? motionDuration(preset)),
        delay: reduced ? 0 : Math.max(0, delay + sequenceDelay),
        easing: motionTokens.easing.enter,
      })
    }
    let observer: IntersectionObserver | undefined
    const bounds = element.getBoundingClientRect()
    const visible = bounds.top < window.innerHeight - 24 && bounds.bottom > 0
    if (
      viewport &&
      !visible &&
      !reduced &&
      typeof IntersectionObserver !== 'undefined'
    ) {
      observer = new IntersectionObserver(
        (entries) => {
          if (!entries.some((entry) => entry.isIntersecting)) return
          observer?.disconnect()
          play()
        },
        { threshold: 0, rootMargin: '0px 0px -24px 0px' }
      )
      observer.observe(element)
    } else play()
    return () => {
      observer?.disconnect()
      stop?.()
    }
  }, [
    preset,
    duration,
    delay,
    replayKey,
    viewport,
    disabled,
    reduced,
    sequenceDelay,
    targetSelector,
  ])
  return ref
}
