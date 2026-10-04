import { CheckCircle2 } from 'lucide-react'
import type { ServiceReadiness } from '@/features/expert-context'

export function ServiceReadinessSummary({ services }: { services: ServiceReadiness[] }) {
  return <section className="ep-service-section" aria-labelledby="readiness-heading">
    <div className="ep-section-heading"><div><h2 id="readiness-heading">Service readiness</h2><p>Your ability to receive new bookings.</p></div></div>
    {services.length === 0 ? <div className="ep-empty"><h3>No services supplied</h3><p>No service readiness data was returned for this account.</p></div> : <ul className="ep-service-list">{services.map((service) => <li key={service.serviceId}>
      <h3>{service.serviceName}</h3>
      <span className={`ep-status ${service.bookingAllowed ? 'ep-status-ready' : 'ep-status-neutral'}`}>{service.bookingAllowed && <CheckCircle2 size={13} aria-hidden="true" />}{service.bookingAllowed ? 'Open for bookings' : 'Not receiving bookings'}</span>
      <dl className="ep-service-facts"><div><dt>Qualification</dt><dd>{service.qualificationStatus === 'APPROVED_FOR_SERVICE' ? 'Approved for service' : service.qualificationStatus.replaceAll('_', ' ').toLowerCase()}</dd></div><div><dt>Service</dt><dd>{service.serviceStatus.toLowerCase()}</dd></div><div><dt>Availability</dt><dd>{service.availability ? 'On' : 'Off'}</dd></div><div><dt>Effective price</dt><dd>{service.pricing?.version ?? 'No effective pricing'}</dd></div></dl>
      {service.pendingPricingVersion && <p className="ep-pricing-note">{service.pendingPricingVersion} is awaiting approval. {service.pricing ? `${service.pricing.version} remains effective.` : 'No approved pricing is currently effective.'}</p>}
      {service.reasons.map((reason) => <p className="ep-readiness-reason" key={reason}>{reason}</p>)}
    </li>)}</ul>}
    <p className="ep-readiness-footnote">Readiness is assessed per service. Booking restrictions do not prevent access to existing work.</p>
  </section>
}
