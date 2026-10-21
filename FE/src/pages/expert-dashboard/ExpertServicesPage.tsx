import { Link, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  Circle,
  Clock3,
  DollarSign,
} from 'lucide-react'
import { useExpertPresentation } from '@/features/expert-dashboard/hooks/useExpertPresentation'
import {
  useExpertContext,
  type ServiceReadiness,
} from '@/features/expert-context'

export default function ExpertServicesPage() {
  const { t } = useTranslation('expert')
  const display = useExpertPresentation()
  const { data, isError, refetch } = useExpertContext()
  if (!data)
    return (
      <div role="status" className="py-8 text-[var(--ep-muted)]">
        {t(isError ? 'serviceSetup.loadFailed' : 'serviceSetup.loading')}
        {isError && (
          <button
            type="button"
            onClick={() => void refetch()}
            className="ep-button ml-3"
          >
            {t('serviceSetup.retry')}
          </button>
        )}
      </div>
    )
  const receiving = data.services.filter((s) => s.bookingAllowed).length
  return (
    <div className="space-y-6">
      <div className="ep-page-heading">
        <div>
          <h1>{t('serviceSetup.title')}</h1>
          <p>{t('serviceSetup.description')}</p>
        </div>
      </div>
      <dl className="flex flex-wrap gap-x-8 gap-y-3 border-y border-[var(--ep-line)] py-4 text-sm">
        {[
          [t('totalServices'), data.services.length],
          [t('openForBookings'), receiving],
          [t('serviceSetup.toPrepare'), data.services.length - receiving],
        ].map(([label, count]) => (
          <div key={label} className="flex items-baseline gap-2">
            <dd className="order-2 font-semibold text-[var(--ep-ink)] tabular-nums">
              {display.number(Number(count))}
            </dd>
            <dt className="text-[var(--ep-muted)]">{label}</dt>
          </div>
        ))}
      </dl>
      {data.services.length === 0 ? (
        <div className="ep-empty">
          <h3>{t('noServicesRegistered')}</h3>
          <p>
            {t(
              'youHaveNotRegisteredForAnyServicesYetServiceRegistrationIsAvailableThroughTheExpertOnboardingFlow'
            )}
          </p>
          <Link to="/expert/qualifications" className="ep-button mt-4">
            {t('serviceSetup.review')}
          </Link>
        </div>
      ) : (
        <div className="space-y-5">
          {data.services.map((service) => (
            <ServiceCard key={service.serviceId} service={service} />
          ))}
        </div>
      )}
    </div>
  )
}

function ServiceCard({ service }: { service: ServiceReadiness }) {
  const { t } = useTranslation('expert')
  const display = useExpertPresentation()
  const location = useLocation()
  const approved = service.qualificationStatus === 'APPROVED_FOR_SERVICE'
  const pricingPath = `/expert/services/${encodeURIComponent(service.serviceId)}/pricing${location.search}`
  const availabilityPath = `/expert/availability${location.search}`
  const needsPrice =
    approved && !service.pricing && !service.pendingPricingVersion
  const needsAvailability =
    approved && !!service.pricing && !service.availability
  const steps = [
    {
      label: t('qualification'),
      done: approved,
      value: display.qualification(service.qualificationStatus),
    },
    {
      label: t('serviceStatus'),
      done: service.serviceStatus === 'ACTIVE',
      value: display.serviceStatus(service.serviceStatus),
    },
    {
      label: t('effectivePricing'),
      done: !!service.pricing,
      value: service.pricing
        ? t('pricingEffective', { version: service.pricing.version })
        : service.pendingPricingVersion
          ? t('pricingPending', { version: service.pendingPricingVersion })
          : t('noEffectivePricing'),
    },
    {
      label: t('serviceSetup.availability'),
      done: service.availability,
      value: t(
        service.availability
          ? 'serviceSetup.availabilityReady'
          : 'serviceSetup.availabilityMissing'
      ),
    },
  ]
  return (
    <article className="overflow-hidden rounded-xl border border-[var(--ep-line)] bg-[var(--ep-surface)]">
      <header className="flex flex-wrap items-start justify-between gap-4 px-5 py-5 sm:px-6">
        <div className="min-w-0">
          <h2 className="!m-0 !font-sans !text-lg !font-semibold">
            {service.serviceName}
          </h2>
          <p className="!mt-2 !mb-0 !max-w-none text-sm text-[var(--ep-muted)]">
            {t(
              service.bookingAllowed
                ? 'serviceSetup.readyHelp'
                : approved
                  ? 'serviceSetup.approvedHelp'
                  : 'serviceSetup.reviewHelp'
            )}
          </p>
        </div>
        <span
          className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${service.bookingAllowed ? 'bg-[var(--ui-success-soft)] text-[var(--ui-success)]' : 'bg-[var(--ep-surface-raised)] text-[var(--ep-muted)]'}`}
        >
          {service.bookingAllowed ? (
            <CheckCircle2 size={14} aria-hidden="true" />
          ) : (
            <Clock3 size={14} aria-hidden="true" />
          )}
          {t(
            service.bookingAllowed
              ? 'openForBookings'
              : approved
                ? 'serviceSetup.settingUp'
                : 'notReceivingBookings'
          )}
        </span>
      </header>
      <dl className="mx-5 grid grid-cols-1 gap-x-6 gap-y-5 border-y border-[var(--ep-line)] py-5 sm:mx-6 sm:grid-cols-2 xl:grid-cols-4">
        {steps.map((step) => (
          <div key={step.label} className="flex min-w-0 items-start gap-2.5">
            {step.done ? (
              <CheckCircle2
                className="mt-0.5 shrink-0 text-[var(--ui-success)]"
                size={17}
                aria-hidden="true"
              />
            ) : (
              <Circle
                className="mt-0.5 shrink-0 text-[var(--ep-muted)]"
                size={17}
                aria-hidden="true"
              />
            )}
            <div className="min-w-0">
              <dt className="text-xs text-[var(--ep-muted)]">{step.label}</dt>
              <dd className="mt-1 text-sm leading-relaxed font-medium text-[var(--ep-ink)]">
                {step.value}
              </dd>
            </div>
          </div>
        ))}
      </dl>
      <div className="px-5 py-5 sm:px-6">
        {service.reasons.length > 0 && (
          <div className="mb-5">
            <h3 className="!mb-2 !font-sans !text-sm !font-semibold">
              {t('serviceSetup.remaining')}
            </h3>
            <ul className="list-disc space-y-1 pl-5 text-sm leading-relaxed text-[var(--ep-muted)]">
              {service.reasons.map((reason) => (
                <li key={reason}>{display.reason(reason)}</li>
              ))}
            </ul>
          </div>
        )}
        {service.pricing && (
          <p className="!mb-4 !max-w-none text-xs text-[var(--ep-muted)]">
            {t('pricingFrom', {
              date: display.timestamp(
                service.pricing.effectiveFrom,
                'Asia/Ho_Chi_Minh',
                { day: '2-digit', month: 'short', year: 'numeric' }
              ),
            })}
          </p>
        )}
        {service.pricing && service.pendingPricingVersion && (
          <p className="!mb-4 !max-w-none text-sm text-[var(--ep-muted)]">
            {t('pricingPending', { version: service.pendingPricingVersion })}{' '}
            {t('pricingEffective', { version: service.pricing.version })}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-3">
          {approved ? (
            <>
              <Link
                to={pricingPath}
                className={`ep-button ${needsPrice ? 'ep-button-primary' : ''}`}
              >
                <DollarSign size={16} aria-hidden="true" />
                {t(needsPrice ? 'serviceSetup.configurePrice' : 'pricing.view')}
                {needsPrice && <ArrowRight size={15} aria-hidden="true" />}
              </Link>
              <Link
                to={availabilityPath}
                className={`ep-button ${needsAvailability ? 'ep-button-primary' : ''}`}
              >
                <CalendarClock size={16} aria-hidden="true" />
                {t('serviceSetup.configureAvailability')}
              </Link>
            </>
          ) : (
            <Link
              to={`/expert/qualifications${location.search}`}
              className="ep-button"
            >
              {t('serviceSetup.review')}
              <ArrowRight size={15} aria-hidden="true" />
            </Link>
          )}
        </div>
      </div>
    </article>
  )
}
