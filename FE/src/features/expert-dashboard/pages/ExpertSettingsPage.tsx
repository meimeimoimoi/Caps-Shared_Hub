import { useEffect, useRef } from 'react'
import {
  ArrowLeft,
  ArrowUpRight,
  CheckCircle2,
  Settings,
  ShieldCheck,
  User,
  BriefcaseBusiness,
} from 'lucide-react'
import { Link, NavLink, useLocation, useParams } from 'react-router-dom'
import { useExpertContext } from '@/features/expert-context'
import { isExpertDemo } from '@/shared/lib/expert-data-source'
import {
  DashboardSectionState,
  DashboardSkeleton,
} from '../components/DashboardSectionState'

const sections = [
  {
    id: 'account',
    label: 'Account',
    description: 'Your identity and contact details.',
    icon: User,
  },
  {
    id: 'expert-profile',
    label: 'Expert profile',
    description: 'Your professional account and services.',
    icon: BriefcaseBusiness,
  },
  {
    id: 'access',
    label: 'Access & permissions',
    description: 'Your access to the expert workspace.',
    icon: ShieldCheck,
  },
]
const statuses: Record<string, string> = {
  ACTIVE: 'Active',
  PENDING: 'Pending',
  SUSPENDED: 'Suspended',
}
const permissions: Record<string, string> = {
  'expert.overview.read': 'View the expert overview',
}

export default function ExpertSettingsPage() {
  const context = useExpertContext()
  const { section = 'account' } = useParams()
  const { search } = useLocation()
  const current = sections.find((entry) => entry.id === section)
  const heading = useRef<HTMLHeadingElement>(null)
  useEffect(() => {
    heading.current?.focus({ preventScroll: true })
  }, [section])
  if (context.isPending) return <DashboardSkeleton />
  if (!context.data)
    return (
      <DashboardSectionState
        title="Settings unavailable"
        message="Your account information could not be loaded. Retry to reconnect."
        retry={() => void context.refetch()}
      />
    )
  if (!current)
    return (
      <div className="ep-empty">
        <h1>Settings page not found</h1>
        <p>Choose an available account settings section.</p>
        <Link
          className="ep-link"
          to={{ pathname: '/expert/settings/account', search }}
        >
          Back to account settings
        </Link>
      </div>
    )
  const data = context.data
  const status = statuses[data.accountStatus] ?? data.accountStatus
  const initials = data.displayName
    .trim()
    .split(/\s+/)
    .map((part) => part[0])
    .slice(0, 2)
    .join('')

  return (
    <div className="ep-settings mx-auto my-0 max-w-275">
      <Link
        className="ep-settings-back text-hub-muted! mb-6 inline-flex items-center gap-2 text-[13px] [&:hover]:underline [&:hover]:underline-offset-1"
        to={{ pathname: '/expert/overview', search }}
      >
        <ArrowLeft size={15} aria-hidden="true" />
        Back to workspace
      </Link>
      <div className="ep-page-heading">
        <div>
          <h1>Settings</h1>
          <p>Your personal account and expert workspace access.</p>
        </div>
        <Settings
          className="ep-settings-heading-icon text-[#7b8796]"
          size={24}
          aria-hidden="true"
        />
      </div>
      <div className="ep-settings-layout mt-8 grid grid-cols-[220px_minmax(0,_1fr)] gap-9 max-[1101px]:grid-cols-[190px_minmax(0,_1fr)] max-[1101px]:gap-6 max-[768px]:mt-6 max-[768px]:grid-cols-[minmax(0,_1fr)] max-[768px]:gap-5">
        <nav
          className="ep-settings-navigation [&_>_p]:text-hub-muted pt-1 max-[768px]:flex max-[768px]:flex-wrap max-[768px]:gap-[6px] max-[768px]:p-0 [&_>_p]:max-w-[25ch] [&_>_p]:[padding:20px_12px] [&_>_p]:text-[12px] max-[768px]:[&_>_p]:hidden"
          aria-label="Settings sections"
        >
          {sections.map((entry) => {
            const Icon = entry.icon
            return (
              <NavLink
                key={entry.id}
                to={{ pathname: `/expert/settings/${entry.id}`, search }}
                className={({ isActive }) =>
                  `ep-settings-nav-link text-hub-muted! [&.active]:text-hub-action-hover! mb-1 flex min-h-11 items-center gap-3 rounded-lg p-3 text-[13px] font-medium max-[768px]:[padding:10px] [&.active]:bg-[#ffeddc] [&.active]:bg-none [&.active]:font-[650] [&:hover]:bg-[#eae8e3] [&:hover]:bg-none max-[768px]:m-0 ${isActive ? 'active' : ''}`
                }
              >
                <Icon size={18} aria-hidden="true" />
                <span>{entry.label}</span>
              </NavLink>
            )
          })}
          <p>Account settings are separate from your case workflow.</p>
        </nav>
        <section
          className="ep-settings-content min-w-0 rounded-[14px] bg-[#fff] bg-none p-8 [border:1px_solid_#e0e4e7] max-[1101px]:p-6 max-[768px]:[padding:22px_18px]"
          aria-labelledby="settings-section-heading"
        >
          <header className="ep-settings-section-heading [&_p]:text-hub-muted pb-6 [border-bottom:1px_solid_#e6e9ec] [&_h2]:text-[22px] [&_h2:focus]:[outline:none] [&_p]:mt-[6px]">
            <h2 id="settings-section-heading" ref={heading} tabIndex={-1}>
              {current.label}
            </h2>
            <p>{current.description}</p>
          </header>
          {context.isError && (
            <div
              className="ep-settings-note [&_p]:text-hub-muted mt-6 rounded-lg bg-[#f5f6f5] bg-none [padding:16px_18px] text-[13px] text-[#475569] [&_p]:mt-1"
              role="status"
            >
              The latest update failed. Showing the last loaded account
              information.{' '}
              <button
                className="ep-inline-button"
                onClick={() => void context.refetch()}
                disabled={context.isFetching}
              >
                Retry
              </button>
            </div>
          )}
          {section === 'account' && (
            <>
              <div className="ep-settings-identity [&_p]:text-hub-muted flex items-center gap-[18px] [padding:28px_0_12px] max-[768px]:gap-3 max-[768px]:[&_>_div:last-child]:min-w-0 [&_p]:mt-[3px] [&_p]:wrap-anywhere [&_strong]:text-[17px]">
                <div
                  className="ep-settings-avatar text-hub-action-hover grid h-16 w-16 shrink-0 [place-items:center] rounded-full bg-[#ffeddc] bg-none text-[21px] font-[650]"
                  aria-hidden="true"
                >
                  {initials}
                </div>
                <div>
                  <strong>{data.displayName}</strong>
                  <p>{data.email}</p>
                  {isExpertDemo && (
                    <span className="ep-settings-demo mt-2 inline-block text-[12px] text-[#7c3515]">
                      Demonstration account
                    </span>
                  )}
                </div>
              </div>
              <dl className="ep-settings-rows [&_dt_small]:text-hub-muted m-0 [&_>_div]:grid [&_>_div]:grid-cols-[minmax(150px,_1fr)_minmax(0,_1.3fr)] [&_>_div]:gap-6 [&_>_div]:[padding:24px_0] [&_>_div]:[border-bottom:1px_solid_#e6e9ec] max-[768px]:[&_>_div]:grid-cols-[1fr] max-[768px]:[&_>_div]:gap-[10px] max-[768px]:[&_>_div]:[padding:20px_0] [&_dd]:m-0 [&_dd]:wrap-anywhere [&_dt]:font-semibold [&_dt_small]:mt-[5px] [&_dt_small]:block [&_dt_small]:text-[12px] [&_dt_small]:font-normal">
                <div>
                  <dt>
                    Full name
                    <small>The name associated with your account.</small>
                  </dt>
                  <dd>{data.displayName}</dd>
                </div>
                <div>
                  <dt>
                    Email address<small>Your account contact email.</small>
                  </dt>
                  <dd>{data.email}</dd>
                </div>
              </dl>
              <div className="ep-settings-note [&_p]:text-hub-muted mt-6 rounded-lg bg-[#f5f6f5] bg-none [padding:16px_18px] text-[13px] text-[#475569] [&_p]:mt-1">
                <strong>Account details are view-only</strong>
                <p>
                  Name, email and profile photo updates are not available yet.
                </p>
              </div>
            </>
          )}
          {section === 'expert-profile' && (
            <>
              <dl className="ep-settings-rows [&_dt_small]:text-hub-muted m-0 [&_>_div]:grid [&_>_div]:grid-cols-[minmax(150px,_1fr)_minmax(0,_1.3fr)] [&_>_div]:gap-6 [&_>_div]:[padding:24px_0] [&_>_div]:[border-bottom:1px_solid_#e6e9ec] max-[768px]:[&_>_div]:grid-cols-[1fr] max-[768px]:[&_>_div]:gap-[10px] max-[768px]:[&_>_div]:[padding:20px_0] [&_dd]:m-0 [&_dd]:wrap-anywhere [&_dt]:font-semibold [&_dt_small]:mt-[5px] [&_dt_small]:block [&_dt_small]:text-[12px] [&_dt_small]:font-normal">
                <div>
                  <dt>
                    Expert ID
                    <small>Your professional account identifier.</small>
                  </dt>
                  <dd>{data.expertId}</dd>
                </div>
                <div>
                  <dt>
                    Account status
                    <small>
                      Service qualifications are assessed separately.
                    </small>
                  </dt>
                  <dd>
                    <span
                      className={`ep-status ${data.accountStatus === 'ACTIVE' ? 'ep-status-ready' : data.accountStatus === 'SUSPENDED' ? 'ep-status-danger' : 'ep-status-neutral'}`}
                    >
                      {status}
                    </span>
                  </dd>
                </div>
              </dl>
              <div className="ep-settings-subheading [&_p]:text-hub-muted mt-8 mb-[10px] flex items-start justify-between gap-4 [&_h3]:text-[15px] [&_p]:mt-[5px] [&_p]:text-[12px]">
                <div>
                  <h3>Registered services</h3>
                  <p>Booking readiness is specific to each service.</p>
                </div>
                <Link
                  className="ep-settings-text-link text-hub-action-hover! inline-flex items-center gap-[5px] [padding:3px_0] text-[12px] whitespace-nowrap [&:hover]:underline [&:hover]:underline-offset-1"
                  to={{ pathname: '/expert/services', search }}
                >
                  My Services
                  <ArrowUpRight size={15} aria-hidden="true" />
                </Link>
              </div>
              {data.services.length === 0 ? (
                <div className="ep-settings-note [&_p]:text-hub-muted mt-6 rounded-lg bg-[#f5f6f5] bg-none [padding:16px_18px] text-[13px] text-[#475569] [&_p]:mt-1">
                  <p>No services registered for this account.</p>
                </div>
              ) : (
                <ul className="ep-settings-services [&_li_p]:text-hub-muted m-0 list-none p-0 [&_.ep-status]:shrink-0 [&_li]:flex [&_li]:items-center [&_li]:justify-between [&_li]:gap-4 [&_li]:[padding:20px_0] [&_li]:[border-bottom:1px_solid_#e6e9ec] max-[768px]:[&_li]:flex-col max-[768px]:[&_li]:items-start max-[768px]:[&_li]:gap-[10px] [&_li_p]:mt-[5px] [&_li_p]:text-[12px] [&_li_strong]:text-[13px] [&_li_strong]:font-semibold">
                  {data.services.map((service) => (
                    <li key={service.serviceId}>
                      <div>
                        <strong>{service.serviceName}</strong>
                        <p>
                          {service.qualificationStatus ===
                          'APPROVED_FOR_SERVICE'
                            ? 'Approved for this service'
                            : 'Not yet approved for this service'}
                        </p>
                      </div>
                      <span
                        className={`ep-status ${service.bookingAllowed ? 'ep-status-ready' : 'ep-status-neutral'}`}
                      >
                        {service.bookingAllowed
                          ? 'Open for bookings'
                          : 'Not accepting bookings'}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
          {section === 'access' && (
            <>
              <div className="ep-settings-access [&_p]:text-hub-muted flex items-center gap-[14px] [padding:24px_0] [border-bottom:1px_solid_#e6e9ec] max-[768px]:flex-wrap [&_>_div]:flex-1 [&_>_svg]:shrink-0 [&_>_svg]:text-[#27734d] [&_p]:mt-[5px] [&_p]:text-[13px]">
                <ShieldCheck size={24} aria-hidden="true" />
                <div>
                  <strong>Expert workspace access</strong>
                  <p>
                    {data.portalAccess.allowed
                      ? 'Your account can access the expert workspace.'
                      : (data.portalAccess.reason ??
                        'Access has not been granted.')}
                  </p>
                </div>
                <span
                  className={`ep-status ${data.portalAccess.allowed ? 'ep-status-ready' : 'ep-status-neutral'}`}
                >
                  {data.portalAccess.allowed ? 'Granted' : 'Restricted'}
                </span>
              </div>
              <div className="ep-settings-subheading [&_p]:text-hub-muted mt-8 mb-[10px] flex items-start justify-between gap-4 [&_h3]:text-[15px] [&_p]:mt-[5px] [&_p]:text-[12px]">
                <div>
                  <h3>Assigned permissions</h3>
                  <p>
                    Assigned by the platform. Changes require an authorized
                    administrator.
                  </p>
                </div>
              </div>
              {data.portalAccess.capabilities.length === 0 ? (
                <div className="ep-settings-note [&_p]:text-hub-muted mt-6 rounded-lg bg-[#f5f6f5] bg-none [padding:16px_18px] text-[13px] text-[#475569] [&_p]:mt-1">
                  <p>No specific permissions are assigned to this account.</p>
                </div>
              ) : (
                <ul className="ep-settings-permissions [&_small]:text-hub-muted m-0 list-none p-0 [&_li]:flex [&_li]:items-start [&_li]:gap-[10px] [&_li]:[padding:16px_0] [&_li]:[border-bottom:1px_solid_#e6e9ec] [&_small]:mt-[5px] [&_small]:block [&_small]:text-[12px] [&_small]:wrap-anywhere [&_strong]:text-[13px] [&_strong]:font-medium [&_svg]:mt-[3px] [&_svg]:shrink-0 [&_svg]:text-[#27734d]">
                  {data.portalAccess.capabilities.map((capability) => (
                    <li key={capability}>
                      <CheckCircle2 size={16} aria-hidden="true" />
                      <div>
                        <strong>
                          {permissions[capability] ??
                            'Additional workspace permission'}
                        </strong>
                        <small>{capability}</small>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              <div className="ep-settings-note [&_p]:text-hub-muted mt-6 rounded-lg bg-[#f5f6f5] bg-none [padding:16px_18px] text-[13px] text-[#475569] [&_p]:mt-1">
                <strong>Security settings</strong>
                <p>
                  Password changes, two-factor authentication and session
                  management are not available in this preview.
                </p>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  )
}
