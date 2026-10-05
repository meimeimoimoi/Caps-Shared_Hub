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
  const open = services.filter((service) => service.bookingAllowed).length
  return (
    <ExpertPanel
      className="eo-readiness [&_li_p]:text-[var(--ep-muted)] [&_summary]:text-[var(--ep-muted)] [&_dt]:text-[var(--ep-muted)] [&_>_ul]:m-0 [&_>_ul]:list-none [&_>_ul]:[padding:0_24px] max-[1101px]:[&_>_ul]:grid max-[1101px]:[&_>_ul]:grid-cols-[repeat(3,_minmax(0,_1fr))] max-[1101px]:[&_>_ul]:gap-5 max-[720px]:[&_>_ul]:block max-[720px]:[&_>_ul]:[padding:0_18px] [&_>_ul_>_li]:[padding:18px_0] [&_>_ul_>_li]:[border-top:1px_solid_var(--ep-border)] [&_dd]:m-0 [&_dd]:text-right [&_details]:mt-[10px] [&_dl]:[margin:12px_0_0] [&_dl]:text-[11px] [&_dl_>_div]:[margin:6px_0] [&_dl_>_div]:flex [&_dl_>_div]:justify-between [&_dl_>_div]:gap-[14px] [&_li_p]:mt-[10px] [&_li_p]:text-[12px] [&_summary]:text-[11px]"
      aria-labelledby="readiness-heading"
    >
      <ExpertPanelHeader>
        <div>
          <h2 id="readiness-heading">Service readiness</h2>
          <p>
            {open} of {services.length} services open for bookings.
          </p>
        </div>
        <Link
          className="eo-row-action border-[var(--ep-border)] text-[var(--ep-muted)]! [&:hover]:text-[var(--ep-accent)]! inline-flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[7px] border [&:hover]:bg-[#fff5ee] [&:hover]:bg-none"
          aria-label="Manage services"
          to="/expert/services"
        >
          <ArrowUpRight size={18} aria-hidden="true" />
        </Link>
      </ExpertPanelHeader>
      {services.length === 0 ? (
        <div className="eo-empty text-[var(--ep-muted)] [padding:40px_24px] text-center [&_h3]:mt-[10px] [&_p]:mt-[7px] [&_p]:text-[12px]">
          <h3>No registered services</h3>
          <p>Service readiness will appear once supplied.</p>
        </div>
      ) : (
        <ul>
          {services.map((service) => (
            <li key={service.serviceId}>
              <div className="eo-readiness-title [&_>_svg]:text-[var(--ep-success)] mb-[10px] flex items-start gap-[9px] [&_>_svg]:mt-[2px] [&_>_svg]:shrink-0 [&_h3]:text-[13px]">
                {service.bookingAllowed ? (
                  <CheckCircle2 size={17} aria-hidden="true" />
                ) : (
                  <CircleDashed size={17} aria-hidden="true" />
                )}
                <h3>{service.serviceName}</h3>
              </div>
              <span
                className={`eo-status inline-flex rounded-[5px] bg-[var(--ep-surface-raised)] bg-none [padding:4px_8px] text-[10px] font-semibold whitespace-nowrap text-[var(--ep-muted)] ${service.bookingAllowed ? 'eo-status-ready bg-[#edf7ef] bg-none text-[#20613f]' : ''}`}
              >
                {service.bookingAllowed
                  ? 'Open for bookings'
                  : 'Not receiving bookings'}
              </span>
              {service.reasons.map((reason) => (
                <p key={reason}>{reason}</p>
              ))}
              {service.pendingPricingVersion && (
                <p>
                  {service.pendingPricingVersion} pending approval
                  {service.pricing
                    ? ` · ${service.pricing.version} remains effective`
                    : ''}
                  .
                </p>
              )}
              <details>
                <summary>Readiness details</summary>
                <dl>
                  <div>
                    <dt>Qualification</dt>
                    <dd>
                      {service.qualificationStatus
                        .replaceAll('_', ' ')
                        .toLowerCase()}
                    </dd>
                  </div>
                  <div>
                    <dt>Service status</dt>
                    <dd>{service.serviceStatus.toLowerCase()}</dd>
                  </div>
                  <div>
                    <dt>Availability</dt>
                    <dd>{service.availability ? 'On' : 'Off'}</dd>
                  </div>
                  <div>
                    <dt>Approved price</dt>
                    <dd>
                      {service.pricing?.version ?? 'No effective pricing'}
                    </dd>
                  </div>
                </dl>
              </details>
            </li>
          ))}
        </ul>
      )}
      <ExpertPanelFooter>
        Readiness affects new bookings, not your existing work.
      </ExpertPanelFooter>
    </ExpertPanel>
  )
}




