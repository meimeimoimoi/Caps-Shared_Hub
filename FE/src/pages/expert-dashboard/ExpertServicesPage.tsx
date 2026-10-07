import { useExpertPresentation } from '@/features/expert-dashboard/hooks/useExpertPresentation'
import { useTranslation } from 'react-i18next'
import {
  useExpertContext,
  type ServiceReadiness,
} from '@/features/expert-context'
import {
  CheckCircle2,
  XCircle,
  Clock3,
  DollarSign,
  ToggleLeft,
  ToggleRight,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { useState } from 'react'

export default function ExpertServicesPage() {
  const { t } = useTranslation('expert')
  const display = useExpertPresentation()

  const { data } = useExpertContext()
  if (!data) return null

  return (
    <>
      <div className="ep-page-heading">
        <div>
          <h1>{t('services')}</h1>
          <p>
            {t('manageYourRegisteredServicesQualificationStatusAndPricing')}
          </p>
        </div>
      </div>
      <div className="ep-services-overview">
        <div className="ep-services-stats-row">
          <div className="ep-services-stat">
            <span className="ep-stat-value">
              {display.number(data.services.length)}
            </span>
            <span className="ep-stat-label">{t('totalServices')}</span>
          </div>
          <div className="ep-services-stat">
            <span className="ep-stat-value ep-text-success">
              {display.number(
                data.services.filter((s) => s.bookingAllowed).length
              )}
            </span>
            <span className="ep-stat-label">{t('openForBookings')}</span>
          </div>
          <div className="ep-services-stat">
            <span className="ep-stat-value ep-text-warning">
              {display.number(
                data.services.filter((s) => !s.bookingAllowed).length
              )}
            </span>
            <span className="ep-stat-label">{t('notReceiving')}</span>
          </div>
        </div>
      </div>
      {data.services.length === 0 ? (
        <div className="ep-empty">
          <h3>{t('noServicesRegistered')}</h3>
          <p>
            {t(
              'youHaveNotRegisteredForAnyServicesYetServiceRegistrationIsAvailableThroughTheExpertOnboardingFlow'
            )}
          </p>
        </div>
      ) : (
        <div className="ep-services-list">
          {data.services.map((service) => (
            <ServiceCard key={service.serviceId} service={service} />
          ))}
        </div>
      )}
    </>
  )
}

function ServiceCard({ service }: { service: ServiceReadiness }) {
  const display = useExpertPresentation()
  const { t } = useTranslation('expert')

  const [expanded, setExpanded] = useState(false)
  const qualificationLabels: Record<
    string,
    { label: string; className: string; icon: typeof CheckCircle2 }
  > = {
    APPROVED_FOR_SERVICE: {
      label: t('approvedForService'),
      className: 'ep-status-ready',
      icon: CheckCircle2,
    },
    PENDING_APPROVAL: {
      label: t('pendingApproval'),
      className: 'ep-status-paused',
      icon: Clock3,
    },
    NOT_ELIGIBLE: {
      label: t('notEligible'),
      className: 'ep-status-danger',
      icon: XCircle,
    },
  }
  const qual = qualificationLabels[service.qualificationStatus] ?? {
    label: display.qualification(service.qualificationStatus),
    className: 'ep-status-neutral',
    icon: Clock3,
  }
  const QualIcon = qual.icon

  return (
    <div
      className={`ep-service-card ${expanded ? 'ep-service-card-expanded' : ''}`}
    >
      <div
        className="ep-service-card-header"
        onClick={() => setExpanded(!expanded)}
        role="button"
        tabIndex={0}
        aria-expanded={expanded}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            setExpanded(!expanded)
          }
        }}
      >
        <div className="ep-service-card-title">
          <h3>{service.serviceName}</h3>
          <span
            className={`ep-status ${service.bookingAllowed ? 'ep-status-ready' : 'ep-status-neutral'}`}
          >
            {service.bookingAllowed ? (
              <CheckCircle2 size={13} aria-hidden="true" />
            ) : null}
            {service.bookingAllowed
              ? t('openForBookings')
              : t('notReceivingBookings')}
          </span>
        </div>
        {expanded ? (
          <ChevronUp size={18} aria-hidden="true" />
        ) : (
          <ChevronDown size={18} aria-hidden="true" />
        )}
      </div>
      {expanded && (
        <div className="ep-service-card-body">
          <div className="ep-service-card-grid">
            <div className="ep-service-detail-item">
              <QualIcon size={16} aria-hidden="true" />
              <div>
                <span className="ep-detail-label">{t('qualification')}</span>
                <span className={`ep-status ${qual.className}`}>
                  {qual.label}
                </span>
              </div>
            </div>
            <div className="ep-service-detail-item">
              <Clock3 size={16} aria-hidden="true" />
              <div>
                <span className="ep-detail-label">{t('serviceStatus')}</span>
                <span
                  className={`ep-status ${service.serviceStatus === 'ACTIVE' ? 'ep-status-ready' : 'ep-status-neutral'}`}
                >
                  {display.serviceStatus(service.serviceStatus)}
                </span>
              </div>
            </div>
            <div className="ep-service-detail-item">
              {service.availability ? (
                <ToggleRight size={16} aria-hidden="true" />
              ) : (
                <ToggleLeft size={16} aria-hidden="true" />
              )}
              <div>
                <span className="ep-detail-label">{t('availability')}</span>
                <span>{service.availability ? t('on') : t('off')}</span>
              </div>
            </div>
            <div className="ep-service-detail-item">
              <DollarSign size={16} aria-hidden="true" />
              <div>
                <span className="ep-detail-label">{t('effectivePricing')}</span>
                <span>
                  {service.pricing
                    ? service.pricing.version
                    : t('noEffectivePricing')}
                </span>
                {service.pricing && (
                  <span className="ep-detail-sub">
                    {t('pricingFrom', {
                      date: display.timestamp(
                        service.pricing.effectiveFrom,
                        'Asia/Ho_Chi_Minh',
                        { day: '2-digit', month: 'short', year: 'numeric' }
                      ),
                    })}
                  </span>
                )}
              </div>
            </div>
          </div>
          {service.pendingPricingVersion && (
            <div className="ep-service-pricing-note">
              <DollarSign size={14} aria-hidden="true" />
              <span>
                {t('pricingPending', {
                  version: service.pendingPricingVersion,
                })}{' '}
                {service.pricing
                  ? t('pricingEffective', { version: service.pricing.version })
                  : t('noApprovedPricingIsCurrentlyEffective')}
              </span>
            </div>
          )}
          {service.reasons.length > 0 && (
            <div className="ep-service-reasons">
              {service.reasons.map((r) => (
                <p key={r} className="ep-readiness-reason">
                  {display.demoCopy(r)}
                </p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
