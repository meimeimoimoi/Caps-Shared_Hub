import { useAuthStore } from '@/features/auth/store/authStore'
import { HomeBackToTop } from './HomeBackToTop'
import { PublicFooter } from '@/components/ui/layout/public-footer'
import { HomeHero } from './HomeHero'
import { PublicNavigation } from '@/components/ui/layout/public-navigation'
import { FinalSection } from './FinalSection'
import { FaqSection } from './FaqSection'
import { EscrowSection } from './EscrowSection'
import { VerificationSection } from './VerificationSection'
import { ProductsSection } from './ProductsSection'
import { ProcessSection } from './ProcessSection'
import { useEffect, useRef, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useHomeMotion } from '../hooks/useHomeMotion'
import '@/styles/public-site.css'
export function HomeLanding() {
  const authenticated = useAuthStore((state) => state.isAuthenticated)
  const { t } = useTranslation('home')
  const root = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  useEffect(() => {
    const previous = document.title
    document.title = t('meta.title')
    return () => {
      document.title = previous
    }
  }, [t])
  useHomeMotion(root, t)
  function askAi(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const input = event.currentTarget.querySelector('input')
    navigate('/ai-assistant', {
      state: { homepageQuestion: input?.value.trim() ?? '' },
    })
  }
  return (
    <div id="shub-home" ref={root}>
      <a className="skip" href="#main">
        {t('skip')}
      </a>
      <div className="env" aria-hidden="true"></div>
      <PublicNavigation authenticated={authenticated} />
      <HomeHero onAskAi={askAi} />

      <main id="main" tabIndex={-1}>
        <ProcessSection />
        <ProductsSection />
        <VerificationSection />
        <EscrowSection />
        <FaqSection />
        <FinalSection />
      </main>
      <PublicFooter />
      <HomeBackToTop />
    </div>
  )
}
