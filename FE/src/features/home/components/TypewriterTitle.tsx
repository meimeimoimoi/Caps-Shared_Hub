import { useEffect, useRef, type CSSProperties, type ReactNode } from 'react'

/** Keeps the full layout and accessible title while revealing graphemes in order. */
export function TypewriterTitle({ text }: { text: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  useEffect(() => {
    const element = ref.current
    if (!element) return
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)')
    let timer: ReturnType<typeof setInterval> | undefined
    const letters = Array.from(
      element.querySelectorAll<HTMLElement>('.typewriter-char')
    )
    const finish = () => {
      clearInterval(timer)
      element.dataset.typing = 'done'
      letters.forEach((letter) => {
        delete letter.dataset.cursor
        delete letter.dataset.visible
      })
    }
    if (preference.matches) {
      finish()
      return
    }
    element.dataset.typing = 'waiting'
    letters.forEach((letter) => {
      delete letter.dataset.visible
      delete letter.dataset.cursor
    })
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          element.dataset.typing = 'active'
          observer.disconnect()
          let visible = 0
          timer = setInterval(() => {
            if (visible > 0) delete letters[visible - 1].dataset.cursor
            if (visible >= letters.length) {
              finish()
              return
            }
            letters[visible].dataset.visible = 'true'
            letters[visible].dataset.cursor = 'true'
            visible++
          }, 45)
        }
      },
      { threshold: 0.15 }
    )
    observer.observe(element)
    const onPreference = () => {
      if (preference.matches) {
        finish()
        observer.disconnect()
      }
    }
    preference.addEventListener('change', onPreference)
    return () => {
      observer.disconnect()
      clearInterval(timer)
      preference.removeEventListener('change', onPreference)
    }
  }, [text])

  let index = 0
  let emphasis: 'em' | 'quiet' | null = null
  const segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' })
  const content: ReactNode[] = []
  for (const [partIndex, part] of text
    .split(/(<\/?(?:em|quiet)>|<br\s*\/?>)/g)
    .entries()) {
    if (part === '<em>' || part === '<quiet>') {
      emphasis = part === '<em>' ? 'em' : 'quiet'
      continue
    }
    if (part === '</em>' || part === '</quiet>') {
      emphasis = null
      continue
    }
    if (/^<br\s*\/?>$/.test(part)) {
      content.push(<br key={partIndex} />)
      continue
    }
    const letters = Array.from(segmenter.segment(part), ({ segment }) => (
      <span
        className="typewriter-char"
        key={index}
        style={{ '--char': index++ } as CSSProperties}
      >
        {segment}
      </span>
    ))
    content.push(
      emphasis ? (
        <em
          className={emphasis === 'quiet' ? 'quiet' : undefined}
          key={partIndex}
        >
          {letters}
        </em>
      ) : (
        <span key={partIndex}>{letters}</span>
      )
    )
  }

  return (
    <span
      ref={ref}
      className="typewriter-title"
      aria-label={text
        .replace(/<br\s*\/?>/g, ' ')
        .replace(/<\/?(?:em|quiet)>/g, '')}
    >
      <span aria-hidden="true">{content}</span>
    </span>
  )
}
