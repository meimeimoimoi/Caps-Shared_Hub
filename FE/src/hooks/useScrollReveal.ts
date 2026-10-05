import { useEffect, useRef } from 'react'

/**
 * Progressively reveals child elements as they enter the viewport.
 *
 * Every descendant matching `selector` (default: `[data-reveal]`) starts with
 * `opacity: 0` and receives a `data-revealed` attribute once it enters view,
 * allowing CSS to drive the transition.
 *
 * Elements further down the page stagger automatically based on their DOM
 * index within the observed batch. The hook cleans itself up on unmount.
 *
 * Respects `prefers-reduced-motion: reduce` — all elements are revealed
 * immediately without animation.
 *
 * @example
 * ```tsx
 * function Page() {
 *   const ref = useScrollReveal()
 *   return (
 *     <div ref={ref}>
 *       <section data-reveal>…</section>
 *       <section data-reveal>…</section>
 *     </div>
 *   )
 * }
 * ```
 */
export function useScrollReveal(
  selector = '[data-reveal]',
  { threshold = 0.12, staggerMs = 60 } = {},
) {
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const root = rootRef.current
    if (!root) return

    // Respect motion preference
    const reducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches

    const elements = root.querySelectorAll<HTMLElement>(selector)
    if (!elements.length) return

    if (reducedMotion) {
      // Reveal everything immediately without animation
      elements.forEach((el) => {
        el.dataset.revealed = 'true'
      })
      return
    }

    let batchIndex = 0

    const observer = new IntersectionObserver(
      (entries) => {
        // Sort by vertical position so stagger order follows the page flow
        const entering = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)

        entering.forEach((entry) => {
          const el = entry.target as HTMLElement
          const delay = batchIndex * staggerMs

          el.style.setProperty('--reveal-delay', `${delay}ms`)
          el.dataset.revealed = 'true'

          batchIndex++
          observer.unobserve(el)
        })
      },
      { threshold, rootMargin: '0px 0px -40px 0px' },
    )

    elements.forEach((el) => observer.observe(el))

    return () => observer.disconnect()
  }, [selector, threshold, staggerMs])

  return rootRef
}
