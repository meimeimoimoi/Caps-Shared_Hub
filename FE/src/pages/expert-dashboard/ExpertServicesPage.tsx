import { useExpertContext, type ServiceReadiness } from '@/features/expert-context'
import { CheckCircle2, XCircle, Clock3, DollarSign, ToggleLeft, ToggleRight, ChevronDown, ChevronUp } from 'lucide-react'
import { useState } from 'react'

export default function ExpertServicesPage() {
  const { data } = useExpertContext()
  if (!data) return null

  return <>
    <div className="ep-page-heading"><div><h1>Services</h1><p>Manage your registered services, qualification status and pricing.</p></div></div>
    <div className="ep-services-overview">
      <div className="ep-services-stats-row">
        <div className="ep-services-stat"><span className="ep-stat-value">{data.services.length}</span><span className="ep-stat-label">Total services</span></div>
        <div className="ep-services-stat"><span className="ep-stat-value ep-text-success">{data.services.filter((s) => s.bookingAllowed).length}</span><span className="ep-stat-label">Open for bookings</span></div>
        <div className="ep-services-stat"><span className="ep-stat-value ep-text-warning">{data.services.filter((s) => !s.bookingAllowed).length}</span><span className="ep-stat-label">Not receiving</span></div>
      </div>
    </div>
    {data.services.length === 0 ? <div className="ep-empty"><h3>No services registered</h3><p>You have not registered for any services yet. Service registration is available through the Expert onboarding flow.</p></div>
      : <div className="ep-services-list">{data.services.map((service) => <ServiceCard key={service.serviceId} service={service} />)}</div>}
  </>
}

function ServiceCard({ service }: { service: ServiceReadiness }) {
  const [expanded, setExpanded] = useState(false)
  const qualificationLabels: Record<string, { label: string; className: string; icon: typeof CheckCircle2 }> = {
    APPROVED_FOR_SERVICE: { label: 'Approved for service', className: 'ep-status-ready', icon: CheckCircle2 },
    PENDING_APPROVAL: { label: 'Pending approval', className: 'ep-status-paused', icon: Clock3 },
    NOT_ELIGIBLE: { label: 'Not eligible', className: 'ep-status-danger', icon: XCircle },
  }
  const qual = qualificationLabels[service.qualificationStatus] ?? { label: service.qualificationStatus.replaceAll('_', ' '), className: 'ep-status-neutral', icon: Clock3 }
  const QualIcon = qual.icon

  return <div className={`ep-service-card ${expanded ? 'ep-service-card-expanded' : ''}`}>
    <div className="ep-service-card-header" onClick={() => setExpanded(!expanded)} role="button" tabIndex={0} aria-expanded={expanded} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setExpanded(!expanded) } }}>
      <div className="ep-service-card-title">
        <h3>{service.serviceName}</h3>
        <span className={`ep-status ${service.bookingAllowed ? 'ep-status-ready' : 'ep-status-neutral'}`}>
          {service.bookingAllowed ? <CheckCircle2 size={13} aria-hidden="true" /> : null}
          {service.bookingAllowed ? 'Open for bookings' : 'Not receiving bookings'}
        </span>
      </div>
      {expanded ? <ChevronUp size={18} aria-hidden="true" /> : <ChevronDown size={18} aria-hidden="true" />}
    </div>
    {expanded && <div className="ep-service-card-body">
      <div className="ep-service-card-grid">
        <div className="ep-service-detail-item"><QualIcon size={16} aria-hidden="true" /><div><span className="ep-detail-label">Qualification</span><span className={`ep-status ${qual.className}`}>{qual.label}</span></div></div>
        <div className="ep-service-detail-item"><Clock3 size={16} aria-hidden="true" /><div><span className="ep-detail-label">Service status</span><span className={`ep-status ${service.serviceStatus === 'ACTIVE' ? 'ep-status-ready' : 'ep-status-neutral'}`}>{service.serviceStatus.charAt(0) + service.serviceStatus.slice(1).toLowerCase()}</span></div></div>
        <div className="ep-service-detail-item">{service.availability ? <ToggleRight size={16} aria-hidden="true" /> : <ToggleLeft size={16} aria-hidden="true" />}<div><span className="ep-detail-label">Availability</span><span>{service.availability ? 'On' : 'Off'}</span></div></div>
        <div className="ep-service-detail-item"><DollarSign size={16} aria-hidden="true" /><div><span className="ep-detail-label">Effective pricing</span><span>{service.pricing ? service.pricing.version : 'No effective pricing'}</span>{service.pricing && <span className="ep-detail-sub">Effective from {new Date(service.pricing.effectiveFrom).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>}</div></div>
      </div>
      {service.pendingPricingVersion && <div className="ep-service-pricing-note"><DollarSign size={14} aria-hidden="true" /><span>{service.pendingPricingVersion} is awaiting approval. {service.pricing ? `${service.pricing.version} remains effective.` : 'No approved pricing is currently effective.'}</span></div>}
      {service.reasons.length > 0 && <div className="ep-service-reasons">{service.reasons.map((r) => <p key={r} className="ep-readiness-reason">{r}</p>)}</div>}
    </div>}
  </div>
}
