import { useEffect, useRef, useState } from 'react'
import { motionTokens, useReducedMotion } from '@/components/ui/motion'

/* Số chạy từ giá trị cũ tới giá trị mới (lần đầu từ 0), dùng cho thẻ chỉ số.
 * Trình đọc màn hình chỉ nghe số cuối, không nghe từng bước đếm. */
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
    let raf = requestAnimationFrame(function tick(t) {
      const p = Math.min(1, (t - t0) / duration)
      setShown(start + (value - start) * (1 - (1 - p) ** 3)) // ease-out, chậm dần về cuối
      if (p < 1) raf = requestAnimationFrame(tick)
      else from.current = value
    })
    return () => cancelAnimationFrame(raf)
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
