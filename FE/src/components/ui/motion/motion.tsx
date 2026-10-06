import {
  Children,
  useLayoutEffect,
  useRef,
  useState,
  type ComponentPropsWithoutRef,
} from 'react'
import { animateElement } from './animate'
import { motionFrames, motionTokens, staggerDelay } from './tokens'
import {
  MotionSequenceContext,
  useMotion,
  useReducedMotion,
  type MotionOptions,
} from './use-motion'
import './motion.css'

export function MotionReveal({
  preset,
  duration,
  delay,
  replayKey,
  viewport,
  disabled,
  targetSelector,
  ...props
}: ComponentPropsWithoutRef<'div'> & MotionOptions) {
  const ref = useMotion({
    preset,
    duration,
    delay,
    replayKey,
    viewport,
    disabled,
    targetSelector,
  })
  return <div {...props} ref={ref} />
}

/** Route entrance without remounting forms or transforming workspace chrome. */
export function MotionPage({
  replayKey,
  children,
}: {
  replayKey: string
  children: ComponentPropsWithoutRef<'div'>['children']
}) {
  return (
    <MotionReveal
      preset="fade"
      duration={motionTokens.duration.page}
      replayKey={replayKey}
      targetSelector="[data-motion-content], main"
      data-motion-page
    >
      {children}
    </MotionReveal>
  )
}

/** Children use MotionReveal/useMotion; providers add no DOM or grid wrappers. */
export function MotionStagger({
  children,
  interval = motionTokens.stagger.interval,
  maxDelay = motionTokens.stagger.maxDelay,
  ...props
}: ComponentPropsWithoutRef<'div'> & { interval?: number; maxDelay?: number }) {
  return (
    <div {...props}>
      {Children.toArray(children).map((child, index) => (
        <MotionSequenceContext.Provider
          key={
            (typeof child === 'object' && child !== null && 'key' in child
              ? child.key
              : index) ?? index
          }
          value={staggerDelay(index, interval, maxDelay)}
        >
          {child}
        </MotionSequenceContext.Provider>
      ))}
    </div>
  )
}

/** Exit retains layout but immediately removes focus/interaction from the closing content. */
export function MotionPresence({
  show,
  children,
  preset = 'popover',
  ...props
}: ComponentPropsWithoutRef<'div'> & {
  show: boolean
  preset?: MotionOptions['preset']
}) {
  const [mounted, setMounted] = useState(show)
  const ref = useRef<HTMLDivElement>(null)
  const interrupted = useRef<Keyframe | null>(null)
  const reduced = useReducedMotion()
  // Derive mounting before commit; the animation callback owns delayed unmounting.
  if (show && !mounted) setMounted(true)
  useLayoutEffect(() => {
    const element = ref.current
    if (!element) return
    const enter = motionFrames(preset, reduced)
    let finished = false
    const stop = animateElement(
      element,
      show
        ? [interrupted.current ?? enter[0], enter[1]]
        : [
            {
              opacity: getComputedStyle(element).opacity,
              transform: getComputedStyle(element).transform,
            },
            {
              opacity: 0,
              transform: reduced
                ? 'none'
                : `translateY(-${motionTokens.distance.exit}px) scale(${motionTokens.scale.panel})`,
            },
          ],
      {
        duration: reduced
          ? motionTokens.duration.reduced
          : show
            ? motionTokens.duration.enter
            : motionTokens.duration.exit,
        easing: show ? motionTokens.easing.enter : motionTokens.easing.exit,
      },
      () => {
        finished = true
        if (!show) setMounted(false)
      }
    )
    interrupted.current = null
    return () => {
      if (!finished) {
        const style = getComputedStyle(element)
        interrupted.current = {
          opacity: style.opacity,
          transform: style.transform,
        }
      }
      stop()
    }
  }, [show, mounted, preset, reduced])
  return mounted ? (
    <div
      {...props}
      ref={ref}
      inert={!show}
      aria-hidden={show ? props['aria-hidden'] : true}
    >
      {children}
    </div>
  ) : null
}

/** Native SVG draw animation; actual path data remains owned by the caller. */
export function MotionPath({
  duration = motionTokens.duration.chart,
  delay = motionTokens.delay.chart,
  d,
  ...props
}: ComponentPropsWithoutRef<'path'> & { duration?: number; delay?: number }) {
  const ref = useRef<SVGPathElement>(null)
  const reduced = useReducedMotion()
  useLayoutEffect(() => {
    const path = ref.current
    if (!path) return
    const length = path.getTotalLength()
    return animateElement(
      path,
      reduced
        ? [{ opacity: 0.35 }, { opacity: 1 }]
        : [
            {
              strokeDasharray: `${length} ${length}`,
              strokeDashoffset: length,
              opacity: 0.5,
            },
            {
              strokeDasharray: `${length} ${length}`,
              strokeDashoffset: 0,
              opacity: 1,
            },
          ],
      {
        duration: reduced ? motionTokens.duration.reduced : duration,
        delay: reduced ? 0 : delay,
        easing: motionTokens.easing.enter,
      }
    )
  }, [d, duration, delay, reduced])
  return <path {...props} d={d} ref={ref} />
}
