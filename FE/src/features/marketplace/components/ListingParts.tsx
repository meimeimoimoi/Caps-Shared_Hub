import { useId } from 'react'
import { Check, ShieldCheck } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useFormatters } from '@/hooks/useFormatters'
import type { Availability } from '../fixtures'

export function AvailabilityTag({
  availability,
  detailed = false,
}: {
  availability: Availability
  detailed?: boolean
}) {
  const { t } = useTranslation('marketplace')
  const format = useFormatters()
  const detail =
    availability.state === 'open'
      ? t('availability.openDetail', { hours: availability.responseHours })
      : availability.state === 'full'
        ? t('availability.fullDetail', {
            date: format.dateOnly(availability.reopensAt),
          })
        : t('availability.pausedDetail')
  return (
    <span className="mk-avail" data-state={availability.state}>
      <span className="mk-avail-dot" aria-hidden="true" />
      <span className="mk-avail-text">
        <b>{t(`availability.${availability.state}`)}</b>
        {detailed ? (
          <small>{detail}</small>
        ) : (
          <span className="sr-only"> · {detail}</span>
        )}
      </span>
    </span>
  )
}

/** Gate 1 (cấp Expert) → Gate 2 (cấp Expert–Dịch vụ) → Pricing Version đã duyệt: mọi chuyên gia trên Sàn đều đạt
    cả ba, nên gom thành một huy hiệu; ngày đạt từng điều kiện mở ra khi rê chuột hoặc focus. */
export function VerifiedBadge({
  eligibleSince,
  approvedAt,
  pricingVersion,
}: {
  eligibleSince: string
  approvedAt: string
  pricingVersion: string
}) {
  const { t } = useTranslation('marketplace')
  const format = useFormatters()
  const id = useId()
  const steps = [
    t('trail.gate1Detail', { date: format.dateOnly(eligibleSince) }),
    t('trail.gate2Detail', { date: format.dateOnly(approvedAt) }),
    t('trail.priceDetail', { version: pricingVersion }),
  ]
  return (
    <span className="mk-verified" tabIndex={0} aria-describedby={id}>
      <ShieldCheck size={15} aria-hidden="true" />
      {t('trail.badge')}
      <span className="mk-pop" role="tooltip" id={id}>
        <b>{t('trail.label')}</b>
        <span className="mk-pop-list">
          {steps.map((step) => (
            <span key={step}>
              <Check size={13} strokeWidth={2.5} aria-hidden="true" />
              {step}
            </span>
          ))}
        </span>
      </span>
    </span>
  )
}

/** Ảnh đại diện; chưa có ảnh thì hiện chữ viết tắt. Ảnh mang tính trang trí (tên đứng ngay cạnh) nên alt rỗng. */
export function Avatar({
  src,
  text,
  large = false,
}: {
  src?: string | null
  text: string
  large?: boolean
}) {
  const className = large ? 'mk-avatar mk-avatar-lg' : 'mk-avatar'
  return src ? (
    <img
      className={className}
      src={src}
      alt=""
      loading="lazy"
      decoding="async"
    />
  ) : (
    <span className={className} aria-hidden="true">
      {text}
    </span>
  )
}
