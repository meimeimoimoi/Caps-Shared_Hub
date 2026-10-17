import { useEffect, type RefObject } from 'react'
import { flushSync } from 'react-dom'

const reducedMotion = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

/** Lọc/sắp xếp qua View Transitions: hàng giữ nguyên trượt về vị trí mới, hàng mất mờ đi, hàng mới hiện dần.
 *  Trình duyệt chưa hỗ trợ hoặc người dùng giảm chuyển động thì cập nhật thẳng. */
export function withViewTransition(update: () => void) {
  if (!document.startViewTransition || reducedMotion()) {
    update()
    return
  }
  document.startViewTransition(() => flushSync(update))
}

/** Hàng chỉ hiện dần khi cuộn tới; các hàng vào khung nhìn cùng lượt nối nhau theo nhịp.
 *  `deps` đổi (vd. danh sách sau khi lọc) thì quan sát thêm các hàng mới — điều hooks/useScrollReveal
 *  (chỉ quét một lần lúc mount) không làm được. Dùng data-mk-reveal/data-mk-in, không dùng [data-reveal]
 *  vì globals.css đã ẩn mọi [data-reveal] cho tới khi useScrollReveal gắn data-revealed. */
export function useRevealRows(
  list: RefObject<HTMLElement | null>,
  deps: readonly unknown[]
) {
  useEffect(() => {
    const root = list.current
    if (!root) return
    const pending = [
      ...root.querySelectorAll<HTMLElement>(
        '[data-mk-reveal]:not([data-mk-in])'
      ),
    ]
    if (reducedMotion() || !('IntersectionObserver' in window)) {
      pending.forEach((row) => (row.dataset.mkIn = 'true'))
      return
    }
    const observer = new IntersectionObserver(
      (entries) => {
        entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
          .forEach((entry, order) => {
            const row = entry.target as HTMLElement
            row.style.setProperty('--i', String(Math.min(order, 6)))
            row.dataset.mkIn = 'true'
            observer.unobserve(row)
          })
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.12 }
    )
    pending.forEach((row) => observer.observe(row))
    return () => observer.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deps do trang gọi truyền vào
  }, deps)
}
