import { useEffect, useRef, useState } from 'react'
import { motionTokens, useReducedMotion } from '@/components/ui/motion'

/* Number that runs from the previous value to the new one (from 0 the first time), for KPI cards.
 * Screen readers hear only the final number, never the counting steps. A timer lands the real
 * value even when animation frames never fire (hidden tab), so a stale 0 is never left on screen. */
export function CountUp({
  value,
  format,
}: {
  value: number
  format: (n: number) => string
}) {
  const reduced = useReducedMotion()
  const from = useRef(0)
  const [shown, setShown] = useState(0)

  useEffect(() => {
    if (reduced) return
    const start = from.current
    const t0 = performance.now()
    const duration = motionTokens.duration.enter
    const land = () => {
      setShown(value)
      from.current = value
    }
    let raf = requestAnimationFrame(function tick(t) {
      const p = Math.min(1, (t - t0) / duration)
      setShown(start + (value - start) * (1 - (1 - p) ** 3)) // ease-out, slowing to the end
      if (p < 1) raf = requestAnimationFrame(tick)
      else from.current = value
    })
    const fallback = setTimeout(land, document.hidden ? 0 : duration + 100)
    return () => {
      cancelAnimationFrame(raf)
      clearTimeout(fallback)
    }
  }, [value, reduced])

  return (
    <>
      <span aria-hidden="true">
        {format(Math.round(reduced ? value : shown))}
      </span>
      <span className="sr-only">{format(value)}</span>
    </>
  )
}
