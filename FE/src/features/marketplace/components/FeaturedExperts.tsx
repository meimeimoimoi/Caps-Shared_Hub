import type { CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Award, ShieldCheck, Star } from 'lucide-react'
import { useFormatters } from '@/hooks/useFormatters'
import { lowestFee, type Expert } from '../fixtures'
import '../styles/featured.css'

/** Thẻ chuyên gia gọn: dùng ở mục xem trước Sàn trên trang chủ và ở hồ sơ không tìm thấy.
 *  revealFrom: trang chủ truyền thứ tự bắt đầu để thẻ tham gia hiệu ứng .r của mục chứa nó. */
export function FeaturedExperts({
  experts,
  revealFrom,
}: {
  experts: Expert[]
  revealFrom?: number
}) {
  const { t } = useTranslation('marketplace')
  const format = useFormatters()
  return (
    <ul className="market-experts">
      {experts.map((e, i) => (
        <li
          key={e.id}
          className={revealFrom == null ? undefined : 'r'}
          style={
            revealFrom == null
              ? undefined
              : ({ '--i': String(revealFrom + i) } as CSSProperties)
          }
        >
          <Link to={`/experts/${e.id}`} className="me-card">
            <span className="me-top">
              {e.avatar ? (
                <img
                  className="me-avatar"
                  src={e.avatar}
                  alt=""
                  loading="lazy"
                  decoding="async"
                />
              ) : (
                <span className="me-avatar" aria-hidden="true">
                  {e.initials}
                </span>
              )}
              <span className="me-id">
                <span className="me-name">{e.name}</span>
                <span className="me-verified">
                  <ShieldCheck size={14} aria-hidden="true" />
                  {t('trail.badge')}
                </span>
              </span>
            </span>
            <span className="me-headline">{e.headline}</span>
            <span className="me-credential">
              <Award size={15} aria-hidden="true" />
              {e.credential}
            </span>
            <span className="me-foot">
              <span className="me-rating">
                <Star size={15} aria-hidden="true" />
                <b>{format.number(e.rating, { minimumFractionDigits: 2 })}</b>
                {t('row.reviews', { count: e.reviews })}
              </span>
              <span className="me-fee">
                <small>{t('featured.from')}</small>
                <b>{format.money(lowestFee(e))}</b>
              </span>
            </span>
            <span className="me-more">
              {t('row.profile')}
              <span aria-hidden="true">→</span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  )
}
