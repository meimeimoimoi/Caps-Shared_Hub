/** Shared Hub motion language. Durations and delays are milliseconds. */
export const motionTokens = {
  duration: {
    feedback: 220,
    enter: 680,
    panel: 800,
    page: 580,
    exit: 360,
    chart: 1200,
    reduced: 100,
  },
  easing: {
    enter: 'cubic-bezier(.22, 1, .36, 1)',
    exit: 'cubic-bezier(.4, 0, 1, 1)',
    change: 'cubic-bezier(.65, 0, .35, 1)',
  },
  stagger: { interval: 90, maxDelay: 360 },
  distance: { enter: 20, page: 12, popover: 8, exit: 4, drawer: 40 },
  scale: { panel: 0.985, popover: 0.97, press: 0.975 },
  delay: { chart: 120 },
} as const

/** Keep CSS interactions and JS sequences on the same source of truth. */
export function installMotionTokens(root: HTMLElement) {
  for (const [name, value] of Object.entries(motionTokens.duration))
    root.style.setProperty(`--motion-${name}`, `${value}ms`)
  for (const [name, value] of Object.entries(motionTokens.easing))
    root.style.setProperty(`--motion-ease-${name}`, value)
  root.style.setProperty(
    '--motion-stagger-interval',
    `${motionTokens.stagger.interval}ms`
  )
  root.style.setProperty(
    '--motion-press-scale',
    String(motionTokens.scale.press)
  )
}

export type MotionPreset =
  | 'reveal'
  | 'fade'
  | 'panel'
  | 'page'
  | 'popover'
  | 'dialog'
  | 'drawer'
  | 'drawer-left'

export function motionFrames(
  preset: MotionPreset,
  reduced = false
): Keyframe[] {
  if (reduced || preset === 'fade') return [{ opacity: 0.35 }, { opacity: 1 }]
  const transform =
    preset === 'drawer' || preset === 'drawer-left'
      ? `translateX(${preset === 'drawer-left' ? '-' : ''}${motionTokens.distance.drawer}px)`
      : preset === 'dialog'
        ? `translateY(${motionTokens.distance.enter}px) scale(${motionTokens.scale.popover})`
        : preset === 'popover'
          ? `translateY(-${motionTokens.distance.popover}px) scale(${motionTokens.scale.popover})`
          : preset === 'panel'
            ? `translateY(${motionTokens.distance.enter}px) scale(${motionTokens.scale.panel})`
            : `translateY(${preset === 'page' ? motionTokens.distance.page : motionTokens.distance.enter}px)`
  return [
    { opacity: 0, transform },
    { opacity: 1, transform: 'none' },
  ]
}

export function motionDuration(preset: MotionPreset) {
  return preset === 'panel'
    ? motionTokens.duration.panel
    : preset === 'page'
      ? motionTokens.duration.page
      : motionTokens.duration.enter
}

export function staggerDelay(
  index: number,
  interval: number = motionTokens.stagger.interval,
  maxDelay: number = motionTokens.stagger.maxDelay
) {
  return Math.min(
    Math.max(0, index) * Math.max(0, interval),
    Math.max(0, maxDelay)
  )
}
