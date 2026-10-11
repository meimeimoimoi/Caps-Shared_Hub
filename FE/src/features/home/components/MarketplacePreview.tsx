import { useMemo, type CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { ArrowRight, Info } from 'lucide-react'
import { useFormatters } from '@/hooks/useFormatters'
import { useSlaLabel } from '@/features/marketplace/hooks/useSlaLabel'
import { FeaturedExperts } from '@/features/marketplace/components/FeaturedExperts'
import {
  EXPERTS,
  featuredExperts,
  SERVICE_IDS,
} from '@/features/marketplace/fixtures'
import { HomeText } from './HomeText'
import '../styles/market.css'

/* Xem trước Sàn chuyên gia, đặt bên trong mục "Bản nháp nào cũng cần một người đọc lại" (không thêm dải
   nền mới để giữ nhịp sáng/tối xen kẽ của trang chủ). Cùng nguồn dữ liệu với /marketplace nên giá "từ",
   thời hạn và số chuyên gia luôn khớp trang Sàn. */

export function MarketplacePreview() {
  const { t } = useTranslation('home')
  const { t: tm } = useTranslation('marketplace')
  const format = useFormatters()
  const sla = useSlaLabel()

  const services = useMemo(
    () =>
      SERVICE_IDS.map((id) => {
        const offers = EXPERTS.flatMap((e) =>
          e.offers[id] ? [e.offers[id]] : []
        )
        return {
          id,
          count: offers.length,
          from: Math.min(...offers.map((o) => o.price)),
          fastest: Math.min(...offers.map((o) => o.slaHours)),
        }
      }),
    []
  )
  const featured = useMemo(() => featuredExperts(3), [])

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
              <Link to={`/marketplace?service=${s.id}`}>
                <span className="ms-name">{tm(`services.${s.id}.name`)}</span>
                <span className="ms-desc">
                  {tm(`services.${s.id}.deliverable`)}
                </span>
                <span className="ms-facts">
                  <span>
                    <small>{t('market.from')}</small>
                    <b>{format.money(s.from)}</b>
                  </span>
                  <span>
                    <small>{t('market.fastest')}</small>
                    <b>{sla(s.fastest)}</b>
                  </span>
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

        <h4 className="market-sub r" style={{ '--i': '7' } as CSSProperties}>
          {t('market.featured')}
        </h4>
        <FeaturedExperts experts={featured} revealFrom={8} />

        <p className="market-demo">
          <Info size={15} aria-hidden="true" />
          {tm('demo')}
        </p>
      </div>
    </section>
  )
}
