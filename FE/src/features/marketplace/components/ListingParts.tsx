import { useId } from 'react'
import { Check, ShieldCheck } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useFormatters } from '@/hooks/useFormatters'
import type { Availability } from '../types'

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
      ? availability.freeSlots != null
        ? t('availability.freeSlots', { count: availability.freeSlots })
        : availability.responseHours != null
          ? t('availability.openDetail', { hours: availability.responseHours })
          : t('availability.openAny')
      : availability.state === 'full'
        ? availability.reopensAt
          ? t('availability.fullDetail', {
              date: format.dateOnly(availability.reopensAt),
            })
          : t('availability.fullNow')
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

/** Gate 1 (expert level) → Gate 2 (Expert–Service) → the expert's own price: every listed expert passed all
    three, so they collapse into one badge; the dates open on hover or focus (omitted when unknown). */
export function VerifiedBadge({
  eligibleSince,
  approvedAt,
}: {
  eligibleSince: string | null
  approvedAt: string | null
}) {
  const { t } = useTranslation('marketplace')
  const format = useFormatters()
  const id = useId()
  const steps = [
    eligibleSince
      ? t('trail.gate1Detail', { date: format.dateOnly(eligibleSince) })
      : t('trail.gate1Passed'),
    approvedAt
      ? t('trail.gate2Detail', { date: format.dateOnly(approvedAt) })
      : t('trail.gate2Passed'),
    t('trail.priceSet'),
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

/** Avatar; falls back to initials. Decorative (the name sits next to it), so alt is empty. */
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
