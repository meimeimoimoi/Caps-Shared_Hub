import { useTranslation } from 'react-i18next'
import { ShieldCheck } from 'lucide-react'
import { useEffect, useRef } from 'react'
import expertPhoto from '../assets/expert-collaboration.png'

export function AccountIntroduction() {
  const { t } = useTranslation('expertRegistration')

  const photoRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const photo = photoRef.current
    const media = window.matchMedia(
      '(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)'
    )
    if (!photo) return
    let frame = 0
    const reset = () => {
      cancelAnimationFrame(frame)
      photo.removeAttribute('data-tracking')
      photo.style.removeProperty('--photo-x')
      photo.style.removeProperty('--photo-y')
      photo.style.removeProperty('--light-x')
      photo.style.removeProperty('--light-y')
      photo.style.removeProperty('--tilt-x')
      photo.style.removeProperty('--tilt-y')
    }
    const move = (event: PointerEvent) => {
      if (!media.matches || event.pointerType === 'touch') return
      const rect = photo.getBoundingClientRect()
      const x = Math.max(
        0,
        Math.min(1, (event.clientX - rect.left) / rect.width)
      )
      const y = Math.max(
        0,
        Math.min(1, (event.clientY - rect.top) / rect.height)
      )
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        photo.dataset.tracking = 'true'
        photo.style.setProperty('--photo-x', `${(x - 0.5) * 20}px`)
        photo.style.setProperty('--photo-y', `${(y - 0.5) * 14}px`)
        photo.style.setProperty('--tilt-x', `${(0.5 - y) * 6}deg`)
        photo.style.setProperty('--tilt-y', `${(x - 0.5) * 8}deg`)
        photo.style.setProperty('--light-x', `${x * 100}%`)
        photo.style.setProperty('--light-y', `${y * 100}%`)
      })
    }
    photo.addEventListener('pointermove', move)
    photo.addEventListener('pointerleave', reset)
    media.addEventListener('change', reset)
    window.addEventListener('blur', reset)
    return () => {
      reset()
      photo.removeEventListener('pointermove', move)
      photo.removeEventListener('pointerleave', reset)
      media.removeEventListener('change', reset)
      window.removeEventListener('blur', reset)
    }
  }, [])

  return (
    <section className="expert-introduction">
      <h1>
        {t('introduction.heading')}
        <br />
        <em>{t('introduction.impact')}</em>
      </h1>
      <p className="expert-intro-copy">{t('introduction.description')}</p>
      <figure ref={photoRef} className="expert-photo">
        <img
          src={expertPhoto}
          alt={t('introduction.photo')}
          width={1536}
          height={1024}
          fetchPriority="high"
        />
      </figure>
      <div className="expert-review-note">
        <ShieldCheck size={22} aria-hidden="true" />
        <p>{t('introduction.review')}</p>
      </div>
    </section>
  )
}
