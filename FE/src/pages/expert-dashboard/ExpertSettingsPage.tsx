import { useTranslation } from 'react-i18next'
import { useEffect, useRef } from 'react'
import {
  ArrowLeft,
  ArrowUpRight,
  CheckCircle2,
  LockKeyhole,
  ShieldCheck,
  User,
  BriefcaseBusiness,
} from 'lucide-react'
import { Link, NavLink, useLocation, useParams } from 'react-router-dom'
import { useExpertContext } from '@/features/expert-context'
import { AvatarUploader, ChangePasswordForm, useAccount } from '@/features/auth'
import { isExpertDemo } from '@/lib/expert-data-source'
import {
  DashboardSectionState,
  DashboardSkeleton,
} from '../../features/expert-dashboard/components/DashboardSectionState'

export default function ExpertSettingsPage() {
  const { t } = useTranslation('expert')

  const sections = [
    {
      id: 'account',
      label: t('account'),
      description: t('yourIdentityAndContactDetails'),
      icon: User,
    },
    {
      id: 'expert-profile',
      label: t('expertProfile'),
      description: t('yourProfessionalAccountAndServices'),
      icon: BriefcaseBusiness,
    },
    {
      id: 'access',
      label: t('accessPermissions'),
      description: t('yourAccessToTheExpertWorkspace'),
      icon: ShieldCheck,
    },
  ]
  const statuses: Record<string, string> = {
    ACTIVE: t('active'),
    PENDING: t('pending'),
    SUSPENDED: t('suspended'),
  }
  const permissions: Record<string, string> = {
    'expert.overview.read': t('viewTheExpertOverview'),
  }

  const context = useExpertContext()
  // Ảnh đại diện dùng chung với header Expert (features/auth)
  const account = useAccount('expert')
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
        title={t('settingsUnavailable')}
        message={t('yourAccountInformationCouldNotBeLoadedRetryToReconnect')}
        retry={() => void context.refetch()}
      />
    )
  if (!current)
    return (
      <div className="ep-empty">
        <h1>{t('settingsPageNotFound')}</h1>
        <p>{t('chooseAnAvailableAccountSettingsSection')}</p>
        <Link
          className="ep-link"
          to={{ pathname: '/expert/settings/account', search }}
        >
          {t('backToAccountSettings')}
        </Link>
      </div>
    )
  const data = context.data
  const status = statuses[data.accountStatus] ?? data.accountStatus

  return (
    <div className="ep-settings w-full min-w-0 text-[14px] [&_h1]:font-sans! [&_h1]:tracking-[-0.025em] [&_h2]:font-sans! [&_h2]:tracking-[-0.02em] [&_h3]:font-sans!">
      <Link
        className="ep-settings-back mb-6 inline-flex items-center gap-2 text-[13px] text-[var(--ep-muted)]! [&:hover]:underline [&:hover]:underline-offset-1"
        to={{ pathname: '/expert/overview', search }}
      >
        <ArrowLeft size={15} aria-hidden="true" />
        {t('backToWorkspace')}
      </Link>
      <div className="flex items-start justify-between gap-4 border-b border-[var(--ep-line)] pb-6">
        <div>
          <h1 className="text-[30px]! leading-tight! font-semibold!">
            {t('settings')}
          </h1>
          <p className="mt-2 text-[14px] text-[var(--ep-muted)]">
            {t('manageYourAccountInformationAndWorkspaceAccess')}
          </p>
        </div>
      </div>
      <div className="ep-settings-layout mt-6 grid grid-cols-[224px_minmax(0,_1fr)] items-start gap-8 max-[1101px]:grid-cols-[200px_minmax(0,_1fr)] max-[1101px]:gap-6 max-[768px]:grid-cols-[minmax(0,_1fr)] max-[768px]:gap-5">
        <nav
          className="ep-settings-navigation pt-1 max-[768px]:flex max-[768px]:flex-wrap max-[768px]:gap-[6px] max-[768px]:p-0 [&_>_p]:max-w-[25ch] [&_>_p]:[padding:20px_12px] [&_>_p]:text-[12px] [&_>_p]:text-[var(--ep-muted)] max-[768px]:[&_>_p]:hidden"
          aria-label={t('settingsSections')}
        >
          {sections.map((entry) => {
            const Icon = entry.icon
            return (
              <NavLink
                key={entry.id}
                to={{ pathname: `/expert/settings/${entry.id}`, search }}
                className={({ isActive }) =>
                  `mb-1 flex min-h-12 items-center gap-3 rounded-lg px-3 py-3 text-[14px] font-medium no-underline transition-colors focus-visible:outline-2 focus-visible:outline-[var(--ep-accent)] max-[768px]:m-0 ${isActive ? 'bg-[var(--ep-surface-raised)] font-semibold text-[var(--ep-ink)]' : 'text-[var(--ep-muted)] hover:bg-[var(--ep-surface-raised)] hover:text-[var(--ep-ink)]'}`
                }
              >
                <Icon
                  size={18}
                  aria-hidden="true"
                  className={
                    entry.id === section
                      ? 'shrink-0 text-[var(--ep-accent-text)]'
                      : 'shrink-0'
                  }
                />
                <span>{entry.label}</span>
              </NavLink>
            )
          })}
        </nav>
        <section
          className="ep-settings-content min-w-0 rounded-xl bg-[var(--ep-surface)] p-8 ring-1 ring-[var(--ep-line)] max-[1101px]:p-6 max-[768px]:p-5"
          aria-labelledby="settings-section-heading"
        >
          <header className="pb-6 [&_h2]:text-[22px] [&_h2]:font-semibold [&_h2:focus]:outline-none [&_p]:mt-2 [&_p]:text-[14px] [&_p]:text-[var(--ep-muted)]">
            <h2 id="settings-section-heading" ref={heading} tabIndex={-1}>
              {current.label}
            </h2>
            <p>{current.description}</p>
          </header>
          {context.isError && (
            <div
              className="ep-settings-note mt-6 rounded-lg bg-[var(--ep-surface-raised)] bg-none [padding:16px_18px] text-[13px] text-[var(--ep-muted)] [&_p]:mt-1 [&_p]:text-[var(--ep-muted)]"
              role="status"
            >
              {t('theLatestUpdateFailedShowingTheLastLoadedAccountInformation')}{' '}
              <button
                className="ep-inline-button"
                onClick={() => void context.refetch()}
                disabled={context.isFetching}
              >
                {t('retry')}
              </button>
            </div>
          )}
          {section === 'account' && (
            <>
              <div className="ep-settings-identity flex items-center gap-[18px] [padding:28px_0_12px] max-[768px]:gap-3 max-[768px]:[&_>_div:last-child]:min-w-0 [&_p]:mt-[3px] [&_p]:wrap-anywhere [&_p]:text-[var(--ep-muted)] [&_strong]:text-[17px]">
                {/* Ảnh đại diện dùng chung (features/auth); họ tên, email đã có ở các dòng bên dưới */}
                <div>
                  <AvatarUploader
                    name={data.displayName}
                    avatarUrl={account.avatarUrl}
                    onChange={account.saveAvatar}
                  />
                  {isExpertDemo && (
                    <span className="ep-settings-demo mt-2 inline-block text-[12px] text-[var(--ep-warning)]">
                      {t('demonstrationAccount')}
                    </span>
                  )}
                </div>
              </div>
              <dl className="ep-settings-rows m-0 [&_>_div]:grid [&_>_div]:grid-cols-[minmax(150px,_1fr)_minmax(0,_1.3fr)] [&_>_div]:gap-6 [&_>_div]:[padding:24px_0] [&_>_div]:[border-bottom:1px_solid_var(--ep-border)] max-[768px]:[&_>_div]:grid-cols-[1fr] max-[768px]:[&_>_div]:gap-[10px] max-[768px]:[&_>_div]:[padding:20px_0] [&_dd]:m-0 [&_dd]:wrap-anywhere [&_dt]:font-semibold [&_dt_small]:mt-[5px] [&_dt_small]:block [&_dt_small]:text-[12px] [&_dt_small]:font-normal [&_dt_small]:text-[var(--ep-muted)]">
                <div>
                  <dt>
                    {t('fullName')}
                    <small>{t('theNameAssociatedWithYourAccount')}</small>
                  </dt>
                  <dd>{data.displayName}</dd>
                </div>
                <div>
                  <dt>
                    {t('emailAddress')}
                    <small>{t('yourAccountContactEmail')}</small>
                  </dt>
                  <dd>{data.email}</dd>
                </div>
              </dl>
              <div className="ep-settings-note mt-6 rounded-lg bg-[var(--ep-surface-raised)] bg-none [padding:16px_18px] text-[13px] text-[var(--ep-muted)] [&_p]:mt-1 [&_p]:text-[var(--ep-muted)]">
                <strong>{t('accountDetailsAreViewonly')}</strong>
                <p>{t('nameEmailAndProfilePhotoUpdatesAreNotAvailableYet')}</p>
              </div>
            </>
          )}
          {section === 'expert-profile' && (
            <>
              <dl className="ep-settings-rows m-0 [&_>_div]:grid [&_>_div]:grid-cols-[minmax(150px,_1fr)_minmax(0,_1.3fr)] [&_>_div]:gap-6 [&_>_div]:[padding:24px_0] [&_>_div]:[border-bottom:1px_solid_var(--ep-border)] max-[768px]:[&_>_div]:grid-cols-[1fr] max-[768px]:[&_>_div]:gap-[10px] max-[768px]:[&_>_div]:[padding:20px_0] [&_dd]:m-0 [&_dd]:wrap-anywhere [&_dt]:font-semibold [&_dt_small]:mt-[5px] [&_dt_small]:block [&_dt_small]:text-[12px] [&_dt_small]:font-normal [&_dt_small]:text-[var(--ep-muted)]">
                <div>
                  <dt>
                    {t('expertId')}
                    <small>{t('yourProfessionalAccountIdentifier')}</small>
                  </dt>
                  <dd>{data.expertId}</dd>
                </div>
                <div>
                  <dt>
                    {t('accountStatus')}
                    <small>
                      {t('serviceQualificationsAreAssessedSeparately')}
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
              <div className="ep-settings-subheading mt-8 mb-[10px] flex items-start justify-between gap-4 [&_h3]:text-[15px] [&_p]:mt-[5px] [&_p]:text-[12px] [&_p]:text-[var(--ep-muted)]">
                <div>
                  <h3>{t('registeredServices')}</h3>
                  <p>{t('bookingReadinessIsSpecificToEachService')}</p>
                </div>
                <Link
                  className="ep-settings-text-link inline-flex items-center gap-[5px] [padding:3px_0] text-[12px] whitespace-nowrap text-[var(--ep-accent-text)]! [&:hover]:underline [&:hover]:underline-offset-1"
                  to={{ pathname: '/expert/services', search }}
                >
                  {t('myServices')}
                  <ArrowUpRight size={15} aria-hidden="true" />
                </Link>
              </div>
              {data.services.length === 0 ? (
                <div className="ep-settings-note mt-6 rounded-lg bg-[var(--ep-surface-raised)] bg-none [padding:16px_18px] text-[13px] text-[var(--ep-muted)] [&_p]:mt-1 [&_p]:text-[var(--ep-muted)]">
                  <p>{t('noServicesRegisteredForThisAccount')}</p>
                </div>
              ) : (
                <ul className="ep-settings-services m-0 list-none p-0 [&_.ep-status]:shrink-0 [&_li]:flex [&_li]:items-center [&_li]:justify-between [&_li]:gap-4 [&_li]:[padding:20px_0] [&_li]:[border-bottom:1px_solid_var(--ep-border)] max-[768px]:[&_li]:flex-col max-[768px]:[&_li]:items-start max-[768px]:[&_li]:gap-[10px] [&_li_p]:mt-[5px] [&_li_p]:text-[12px] [&_li_p]:text-[var(--ep-muted)] [&_li_strong]:text-[13px] [&_li_strong]:font-semibold">
                  {data.services.map((service) => (
                    <li key={service.serviceId}>
                      <div>
                        <strong>{service.serviceName}</strong>
                        <p>
                          {service.qualificationStatus ===
                          'APPROVED_FOR_SERVICE'
                            ? t('approvedForThisService')
                            : t('notYetApprovedForThisService')}
                        </p>
                      </div>
                      <span
                        className={`ep-status ${service.bookingAllowed ? 'ep-status-ready' : 'ep-status-neutral'}`}
                      >
                        {service.bookingAllowed
                          ? t('openForBookings')
                          : t('notAcceptingBookings')}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
          {section === 'access' && (
            <>
              <div className="flex flex-wrap items-center gap-4 rounded-lg bg-[var(--ep-surface-raised)] p-5">
                <span
                  className={`grid size-11 shrink-0 place-items-center rounded-lg ${data.portalAccess.allowed ? 'bg-[var(--ep-success-bg)] text-[var(--ep-success)]' : 'bg-[var(--ep-warning-bg)] text-[var(--ep-warning)]'}`}
                >
                  <ShieldCheck size={23} aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1 basis-48">
                  <strong className="text-[15px] font-semibold">
                    {t('expertWorkspaceAccess')}
                  </strong>
                  <p className="mt-1 text-[14px] leading-relaxed text-[var(--ep-muted)]">
                    {data.portalAccess.allowed
                      ? t('yourAccountCanAccessTheExpertWorkspace')
                      : (data.portalAccess.reason ??
                        t('accessHasNotBeenGranted'))}
                  </p>
                </div>
                <span
                  className={`inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-[12px] font-semibold ${data.portalAccess.allowed ? 'bg-[var(--ep-success-bg)] text-[var(--ep-success)]' : 'bg-[var(--ep-warning-bg)] text-[var(--ep-warning)]'}`}
                >
                  <span
                    aria-hidden="true"
                    className="size-1.5 rounded-full bg-current"
                  />
                  {data.portalAccess.allowed
                    ? t('accessGranted')
                    : 'Restricted'}
                </span>
              </div>
              <div className="mt-8 grid grid-cols-[minmax(0,1fr)_minmax(260px,.55fr)] gap-8 max-[1101px]:grid-cols-1">
                <div>
                  <div className="mb-5 [&_h3]:text-[16px] [&_h3]:font-semibold [&_p]:mt-2 [&_p]:max-w-[60ch] [&_p]:text-[14px] [&_p]:leading-relaxed [&_p]:text-[var(--ep-muted)]">
                    <div>
                      <h3>{t('assignedPermissions')}</h3>
                      <p>
                        {t(
                          'assignedByThePlatformChangesRequireAnAuthorizedAdministrator'
                        )}
                      </p>
                    </div>
                  </div>
                  {data.portalAccess.capabilities.length === 0 ? (
                    <div className="ep-settings-note mt-6 rounded-lg bg-[var(--ep-surface-raised)] bg-none [padding:16px_18px] text-[13px] text-[var(--ep-muted)] [&_p]:mt-1 [&_p]:text-[var(--ep-muted)]">
                      <p>
                        {t('noSpecificPermissionsAreAssignedToThisAccount')}
                      </p>
                    </div>
                  ) : (
                    <ul className="m-0 list-none divide-y divide-[var(--ep-line)] border-y border-[var(--ep-line)] p-0 [&_li]:flex [&_li]:items-start [&_li]:gap-3 [&_li]:py-5 [&_small]:mt-2 [&_small]:block [&_small]:text-[12px] [&_small]:wrap-anywhere [&_small]:text-[var(--ep-muted)] [&_strong]:text-[14px] [&_strong]:font-semibold [&_svg]:mt-0.5 [&_svg]:shrink-0 [&_svg]:text-[var(--ep-success)]">
                      {data.portalAccess.capabilities.map((capability) => (
                        <li key={capability}>
                          <CheckCircle2 size={16} aria-hidden="true" />
                          <div>
                            <strong>
                              {permissions[capability] ??
                                t('additionalWorkspacePermission')}
                            </strong>
                            <small>{capability}</small>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <aside className="border-l border-[var(--ep-line)] pl-8 max-[1101px]:border-t max-[1101px]:border-l-0 max-[1101px]:pt-6 max-[1101px]:pl-0">
                  <LockKeyhole
                    size={20}
                    aria-hidden="true"
                    className="mb-3 text-[var(--ep-muted)]"
                  />
                  <strong className="text-[15px] font-semibold">
                    {t('securitySettings')}
                  </strong>
                  {/* Form đổi mật khẩu dùng chung (features/auth), cùng quy tắc với trang đăng ký */}
                  <ChangePasswordForm />
                </aside>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  )
}
