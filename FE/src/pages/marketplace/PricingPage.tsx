import { useTranslation } from 'react-i18next'
import { usePageTitle } from '@/hooks/usePageTitle'
import { Link } from 'react-router-dom'
import { VideoBackground } from '@/components/auth/VideoBackground'
import { PublicFooter } from '@/components/ui/layout/public-footer'
import { PublicNavigation } from '@/components/ui/layout/public-navigation'
import { useAuthStore } from '@/features/auth/store/authStore'
import { DEFAULT_HOME } from '@/features/auth/utils/returnPath'
import '@/styles/public-site.css'
import './pricing.css'

export default function PricingPage() {
  const { t } = useTranslation('home')
  usePageTitle(t('pricing.title'))

  return (
    <div id="shub-home">
      <a className="skip" href="#main">
        {t('skip')}
      </a>
      <div className="env" aria-hidden="true" />
      <PublicNavigation
        appHref={useAuthStore((s) => s.token) ? DEFAULT_HOME : undefined}
      />
      <main id="main">
        <section className="ai-hero" aria-labelledby="ai-price-title">
          <VideoBackground className="absolute motion-reduce:hidden" />
          <div className="ai-hero-shade" aria-hidden="true" />
          <div className="wrap">
            <div className="ai-hero-copy">
              <h1 id="ai-price-title">{t('pricing.heading')}</h1>
              <p>{t('pricing.detail')}</p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link className="btn btn-primary" to="/ai-assistant">
                  {t('pricing.ask')}
                </Link>
                <Link className="btn btn-ghost" to="/marketplace">
                  {t('pricing.marketplace')}
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>
      <PublicFooter anchorBase="/" />
    </div>
  )
}
