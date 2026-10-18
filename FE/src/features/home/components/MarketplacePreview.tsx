import { useMemo, type CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { ArrowRight, Info } from 'lucide-react'
import { useFormatters } from '@/hooks/useFormatters'
import { isExpertDemo } from '@/lib/expert-data-source'
import { useSlaLabel } from '@/features/marketplace/hooks/useSlaLabel'
import { useMarketplace } from '@/features/marketplace/hooks/useMarketplace'
import { useServiceText } from '@/features/marketplace/hooks/useServiceText'
import { FeaturedExperts } from '@/features/marketplace/components/FeaturedExperts'
import { featuredExperts, serviceFacts } from '@/features/marketplace/model'
import { HomeText } from './HomeText'
import '../styles/market.css'

/* Marketplace preview inside the "Bản nháp nào cũng cần một người đọc lại" section (no extra band, to keep
   the home page's light/dark rhythm). Same query as /marketplace, so "from" price, delivery time and expert
   count always match the Marketplace page. */

export function MarketplacePreview() {
  const { t } = useTranslation('home')
  const { t: tm } = useTranslation('marketplace')
  const format = useFormatters()
  const sla = useSlaLabel()
  const text = useServiceText()
  const { data } = useMarketplace()

  const services = useMemo(() => (data ? serviceFacts(data) : []), [data])
  const featured = useMemo(
    () => featuredExperts(data?.experts ?? [], 3),
    [data]
  )

  return (
    <section
      className="market-block"
      id="san-chuyen-gia"
      aria-labelledby="h-market"
    >
      <div className="wrap">
        <div className="market-head reveal">
          <div>
            <h3
              id="h-market"
              className="market-title r"
              style={{ '--i': '0' } as CSSProperties}
            >
              <HomeText i18nKey="market.title" />
            </h3>
            <p className="lead r" style={{ '--i': '2' } as CSSProperties}>
              {t('market.lead')}
            </p>
          </div>
          <Link
            className="btn btn-primary market-cta r"
            style={{ '--i': '3' } as CSSProperties}
            to="/marketplace"
          >
            {t('market.cta')}
            <span className="arrow" aria-hidden="true">
              →
            </span>
          </Link>
        </div>

        <ul className="market-services" aria-label={t('market.servicesLabel')}>
          {services.map((s, i) => (
            <li
              key={s.id}
              className="r"
              style={{ '--i': String(4 + i) } as CSSProperties}
            >
              <Link to={`/marketplace?service=${encodeURIComponent(s.id)}`}>
                <span className="ms-name">{text.name(s.id, s.name)}</span>
                {text.deliverable(s.id) && (
                  <span className="ms-desc">{text.deliverable(s.id)}</span>
                )}
                <span className="ms-facts">
                  {s.from != null && (
                    <span>
                      <small>{t('market.from')}</small>
                      <b>{format.money(s.from)}</b>
                    </span>
                  )}
                  {s.fastest != null && (
                    <span>
                      <small>{t('market.fastest')}</small>
                      <b>{sla(s.fastest)}</b>
                    </span>
                  )}
                  <span>
                    <small>{t('market.experts')}</small>
                    <b>{format.number(s.count)}</b>
                  </span>
                  <ArrowRight size={20} aria-hidden="true" className="ms-go" />
                </span>
              </Link>
            </li>
          ))}
        </ul>

        {featured.length > 0 && (
          <>
            <h4
              className="market-sub r"
              style={{ '--i': '7' } as CSSProperties}
            >
              {t('market.featured')}
            </h4>
            <FeaturedExperts experts={featured} revealFrom={8} />
          </>
        )}

        {isExpertDemo && (
          <p className="market-demo">
            <Info size={15} aria-hidden="true" />
            {tm('demo')}
          </p>
        )}
      </div>
    </section>
  )
}
