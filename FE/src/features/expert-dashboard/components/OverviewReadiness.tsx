import { useExpertPresentation } from '@/features/expert-dashboard/hooks/useExpertPresentation'
import { useTranslation } from 'react-i18next'
import {
  ExpertPanel,
  ExpertPanelHeader,
  ExpertPanelFooter,
} from './ExpertPanel'
import { ArrowUpRight, CheckCircle2, CircleDashed } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { ServiceReadiness } from '@/features/expert-context'

export function OverviewReadiness({
  services,
}: {
  services: ServiceReadiness[]
}) {
  const { t } = useTranslation('expert')
  const display = useExpertPresentation()

  const open = services.filter((service) => service.bookingAllowed).length
  return (
    <ExpertPanel
      className="eo-readiness [&_>_ul]:m-0 [&_>_ul]:list-none [&_>_ul]:[padding:0_24px] max-[1101px]:[&_>_ul]:grid max-[1101px]:[&_>_ul]:grid-cols-[repeat(3,_minmax(0,_1fr))] max-[1101px]:[&_>_ul]:gap-5 max-[720px]:[&_>_ul]:block max-[720px]:[&_>_ul]:[padding:0_18px] [&_>_ul_>_li]:[padding:18px_0] [&_>_ul_>_li]:[border-top:1px_solid_var(--ep-border)] [&_dd]:m-0 [&_dd]:text-right [&_details]:mt-[10px] [&_dl]:[margin:12px_0_0] [&_dl]:text-[11px] [&_dl_>_div]:[margin:6px_0] [&_dl_>_div]:flex [&_dl_>_div]:justify-between [&_dl_>_div]:gap-[14px] [&_dt]:text-[var(--ep-muted)] [&_li_p]:mt-[10px] [&_li_p]:text-[12px] [&_li_p]:text-[var(--ep-muted)] [&_summary]:text-[11px] [&_summary]:text-[var(--ep-muted)]"
      aria-labelledby="readiness-heading"
    >
      <ExpertPanelHeader>
        <div>
          <h2 id="readiness-heading">{t('serviceReadiness')}</h2>
          <p>
            {t('readinessCount', {
              open: display.number(open),
              total: display.number(services.length),
            })}
          </p>
        </div>
        <Link
          className="eo-row-action inline-flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[7px] border border-[var(--ep-border)] text-[var(--ep-muted)]! [&:hover]:bg-[var(--ui-accent-soft)] [&:hover]:bg-none [&:hover]:text-[var(--ep-accent-text)]!"
          aria-label={t('manageServices')}
          to="/expert/services"
        >
          <ArrowUpRight size={18} aria-hidden="true" />
        </Link>
      </ExpertPanelHeader>
      {services.length === 0 ? (
        <div className="eo-empty [padding:40px_24px] text-center text-[var(--ep-muted)] [&_h3]:mt-[10px] [&_p]:mt-[7px] [&_p]:text-[12px]">
          <h3>{t('noRegisteredServices')}</h3>
          <p>{t('serviceReadinessWillAppearOnceSupplied')}</p>
        </div>
      ) : (
        <ul>
          {services.map((service) => (
            <li key={service.serviceId}>
              <div className="eo-readiness-title mb-[10px] flex items-start gap-[9px] [&_>_svg]:mt-[2px] [&_>_svg]:shrink-0 [&_>_svg]:text-[var(--ep-success)] [&_h3]:text-[13px]">
                {service.bookingAllowed ? (
                  <CheckCircle2 size={17} aria-hidden="true" />
                ) : (
                  <CircleDashed size={17} aria-hidden="true" />
                )}
                <h3>{service.serviceName}</h3>
              </div>
              <span
                className={`eo-status inline-flex rounded-[5px] bg-[var(--ep-surface-raised)] bg-none [padding:4px_8px] text-[10px] font-semibold whitespace-nowrap text-[var(--ep-muted)] ${service.bookingAllowed ? 'eo-status-ready bg-[var(--ep-success-bg)] bg-none text-[var(--ep-success)]' : ''}`}
              >
                {service.bookingAllowed
                  ? t('openForBookings')
                  : t('notReceivingBookings')}
              </span>
              {service.reasons.map((reason) => (
                <p key={reason}>{display.demoCopy(reason)}</p>
              ))}
              {service.pendingPricingVersion && (
                <p>
                  {t('pricingPending', {
                    version: service.pendingPricingVersion,
                  })}{' '}
                  {service.pricing
                    ? t('pricingEffective', {
                        version: service.pricing.version,
                      })
                    : ''}
                </p>
              )}
              <details>
                <summary>{t('readinessDetails')}</summary>
                <dl>
                  <div>
                    <dt>{t('qualification')}</dt>
                    <dd>
                      {display.qualification(service.qualificationStatus)}
                    </dd>
                  </div>
                  <div>
                    <dt>{t('serviceStatus')}</dt>
                    <dd>{display.serviceStatus(service.serviceStatus)}</dd>
                  </div>
                  <div>
                    <dt>{t('availability')}</dt>
                    <dd>{service.availability ? t('on') : t('off')}</dd>
                  </div>
                  <div>
                    <dt>{t('approvedPrice')}</dt>
                    <dd>
                      {service.pricing?.version ?? t('noEffectivePricing')}
                    </dd>
                  </div>
                </dl>
              </details>
            </li>
          ))}
        </ul>
      )}
      <ExpertPanelFooter>
        {t('readinessAffectsNewBookingsNotYourExistingWork')}
      </ExpertPanelFooter>
    </ExpertPanel>
  )
}
