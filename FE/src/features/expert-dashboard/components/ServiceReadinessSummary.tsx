import { useExpertPresentation } from '@/features/expert-dashboard/hooks/useExpertPresentation'
import { useTranslation } from 'react-i18next'
import { CheckCircle2 } from 'lucide-react'
import type { ServiceReadiness } from '@/features/expert-context'

export function ServiceReadinessSummary({
  services,
}: {
  services: ServiceReadiness[]
}) {
  const { t } = useTranslation('expert')
  const display = useExpertPresentation()

  return (
    <section className="ep-service-section" aria-labelledby="readiness-heading">
      <div className="ep-section-heading">
        <div>
          <h2 id="readiness-heading">{t('serviceReadiness')}</h2>
          <p>{t('yourAbilityToReceiveNewBookings')}</p>
        </div>
      </div>
      {services.length === 0 ? (
        <div className="ep-empty">
          <h3>{t('noServicesSupplied')}</h3>
          <p>{t('noServiceReadinessDataWasReturnedForThisAccount')}</p>
        </div>
      ) : (
        <ul className="ep-service-list">
          {services.map((service) => (
            <li key={service.serviceId}>
              <h3>{service.serviceName}</h3>
              <span
                className={`ep-status ${service.bookingAllowed ? 'ep-status-ready' : 'ep-status-neutral'}`}
              >
                {service.bookingAllowed && (
                  <CheckCircle2 size={13} aria-hidden="true" />
                )}
                {service.bookingAllowed
                  ? t('openForBookings')
                  : t('notReceivingBookings')}
              </span>
              <dl className="ep-service-facts">
                <div>
                  <dt>{t('qualification')}</dt>
                  <dd>
                    {service.qualificationStatus === 'APPROVED_FOR_SERVICE'
                      ? t('approvedForService')
                      : display.qualification(service.qualificationStatus)}
                  </dd>
                </div>
                <div>
                  <dt>{t('service')}</dt>
                  <dd>{display.serviceStatus(service.serviceStatus)}</dd>
                </div>
                <div>
                  <dt>{t('availability')}</dt>
                  <dd>{service.availability ? t('on') : t('off')}</dd>
                </div>
                <div>
                  <dt>{t('effectivePrice')}</dt>
                  <dd>{service.pricing?.version ?? t('noEffectivePricing')}</dd>
                </div>
              </dl>
              {service.pendingPricingVersion && (
                <p className="ep-pricing-note">
                  {t('pricingPending', {
                    version: service.pendingPricingVersion,
                  })}{' '}
                  {service.pricing
                    ? t('pricingEffective', {
                        version: service.pricing.version,
                      })
                    : t('noApprovedPricingIsCurrentlyEffective')}
                </p>
              )}
              {service.reasons.map((reason) => (
                <p className="ep-readiness-reason" key={reason}>
                  {display.demoCopy(reason)}
                </p>
              ))}
            </li>
          ))}
        </ul>
      )}
      <p className="ep-readiness-footnote">
        {t(
          'readinessIsAssessedPerServiceBookingRestrictionsDoNotPreventAccessToExistingWork'
        )}
      </p>
    </section>
  )
}
