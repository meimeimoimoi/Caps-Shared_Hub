import { useState, type CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, Check, ChevronRight, CircleDot } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { useFormatters } from '@/hooks/useFormatters'
import { AdminLayout } from '@/app/layouts/admin/AdminLayout'
import { useAdminNav } from '@/app/layouts/admin/useAdminNav'
import { getApplications } from '../../features/expert-vetting/api/adminApi'
import { getPlatformFees } from '../../features/expert-vetting/api/platformFeeApi'
import { adminKeys } from '../../features/expert-vetting/api/queryKeys'
import {
  PENDING_STATUS,
  QUEUE_TABS,
} from '../../features/expert-vetting/constants'
import { waitedDays } from '../../features/expert-vetting/utils/applications'
import {
  getBillingStats,
  getExpertStats,
  statsKeys,
} from '../../features/admin-analytics/api/statsApi'
import { BarList } from '../../features/admin-analytics/components/BarList'
import { GrowthSection } from '../../features/admin-analytics/components/GrowthSection'
import { KpiCard } from '../../features/admin-analytics/components/KpiCard'
import type { StatusTotal } from '../../features/admin-analytics/types'
import { hasAnyPermission, Permission, useAuthStore } from '@/features/auth'
import { isOverdue, useReviewSlaDays } from '@/features/expert-vetting/hooks/useReviewSlaDays'
import { PageHeader } from '@/components/ui/layout/page-header'
import { LoadError } from '@/components/ui/feedback/load-error'

/* Same months as the monthly growth chart, so the billing request is shared with it */
const BILLING_MONTHS = 12

/* System Admin overview: what needs action now (same items as the notification bell, from
 * useAdminNav), then key figures, growth and where work is stuck. Each block only calls the API
 * the account has permission for. */
export default function AdminDashboardPage() {
  const nav = useAdminNav()
  const { t } = useTranslation('admin')
  const f = useFormatters()
  const [now] = useState(() => Date.now())
  const user = useAuthStore((s) => s.user)
  const canReview = hasAnyPermission(user, [Permission.ExpertReview])
  const canApprove = hasAnyPermission(user, [Permission.ExpertApprove])
  const canSeeMoney = hasAnyPermission(user, [Permission.PayoutManage])
  const canSeeUsers = hasAnyPermission(user, [Permission.UserManage])
  const canSetFees = hasAnyPermission(user, [Permission.PricingManage])
  const slaDays = useReviewSlaDays(canReview)

  const applications = useQuery({
    queryKey: adminKeys.applications(),
    queryFn: ({ signal }) => getApplications(signal),
    enabled: canReview,
  })
  // Only the current month is needed: experts approved this month
  const experts = useQuery({
    queryKey: statsKeys.experts(1),
    queryFn: ({ signal }) => getExpertStats(1, signal),
    enabled: canApprove,
  })
  const billing = useQuery({
    queryKey: statsKeys.billing(BILLING_MONTHS),
    queryFn: ({ signal }) => getBillingStats(BILLING_MONTHS, signal),
    enabled: canSeeMoney,
  })
  const fees = useQuery({
    queryKey: [...adminKeys.all, 'platform-fees'],
    queryFn: ({ signal }) => getPlatformFees(signal),
    enabled: canSetFees,
  })
  const loading = [applications, experts, billing, fees].some((q) => q.isLoading)
  // A failed query would otherwise show as zero counts
  const failed =
    nav.queuesFailed ||
    [applications, experts, billing, fees].some((q) => q.isError)

  const apps = applications.data ?? []
  const pending = apps.filter((a) => a.status === PENDING_STATUS)
  const overdue = pending.filter((a) =>
    isOverdue(waitedDays(a.submittedAt, now), slaDays)
  )

  const find = (list: StatusTotal[] | undefined, status: string) =>
    list?.find((x) => x.status === status) ?? { status, count: 0, amount: 0 }
  const held = find(billing.data?.escrows, 'HELD')
  // Money still in the system: held for open cases, then owed to experts or already refunded
  const moneyRows = billing.data
    ? [
        { key: 'held', total: held, warn: false },
        ...billing.data.payouts.map((p) => ({
          key: `payout-${p.status}`,
          total: p,
          warn: p.status === 'FAILED',
        })),
        {
          key: 'refunded',
          total: find(billing.data.escrows, 'REFUNDED'),
          warn: false,
        },
      ].filter((r) => r.total.amount > 0)
    : []
  const moneyLabel = (key: string, total: StatusTotal) =>
    key === 'held'
      ? t('dashboard.money.held')
      : key === 'refunded'
        ? t('dashboard.money.refunded')
        : total.status === 'PENDING'
          ? t('dashboard.money.payoutPending')
          : t('dashboard.money.payoutOther', { status: total.status })

  const scheduledFees = (fees.data ?? []).filter((fee) => fee.pending)
  // Urgent items lead; the rest keep their order
  const attention = [
    ...nav.notifications.filter((n) => n.tone === 'warning'),
    ...nav.notifications.filter((n) => n.tone !== 'warning'),
  ]
  const urgentCount = attention.filter((n) => n.tone === 'warning').length
  const allClear = !loading && !failed && !nav.operationsUnavailable
  const busy = attention.length > 0
  // Key figures share one ledger panel beside the work list, so missing permissions leave no holes
  const hasLedger = canReview || canApprove || canSeeMoney
  // Calendar days until a scheduled change; both sides as UTC midnights of local dates
  const today = new Date(now)
  const todayUtc = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate())
  const daysUntil = (iso: string) =>
    Math.round((Date.parse(iso.slice(0, 10)) - todayUtc) / 86_400_000)
  const whenLabel = (days: number) =>
    days <= 0
      ? t('dashboard.upcoming.today')
      : days === 1
        ? t('dashboard.upcoming.tomorrow')
        : t('dashboard.upcoming.inDays', { count: days })

  return (
    <AdminLayout
      {...nav}
      section="overview"
      breadcrumb={t('navigation.overview')}
    >
      <PageHeader title={t('dashboard.title')} />
      {failed && <LoadError className="paper mt-8 px-4 py-6" />}

      {/* The page's peak: the work waiting on the admin, urgent items first and set apart */}
      <div
        className={cn(
          'mt-8 grid items-start gap-6',
          hasLedger && busy && 'lg:grid-cols-[minmax(0,1fr)_21rem]'
        )}
      >
      {/* Nothing waiting: the block shrinks to one status line and the key figures lead */}
      <section
        className={cn(
          'paper overflow-hidden',
          !busy &&
            'flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3 md:px-6'
        )}
        aria-labelledby="dash-attention"
      >
        <div
          className={cn(
            busy
              ? 'flex flex-wrap items-baseline gap-x-4 gap-y-1 px-5 pt-5 pb-4 md:px-6'
              : 'contents'
          )}
        >
          <h2
            id="dash-attention"
            className={cn(
              'text-fg-strong font-semibold tracking-tight text-balance',
              attention.length ? 'text-h1-tool' : 'text-h2'
            )}
          >
            {t('dashboard.attention.title')}
          </h2>
          {attention.length > 0 && (
            <p className="text-fg-muted text-sm">
              <span className="num text-fg-strong font-semibold">
                {t('dashboard.attention.count', { count: attention.length })}
              </span>
              {urgentCount > 0 && (
                <>
                  {' · '}
                  <span className="text-warning font-semibold">
                    {t('dashboard.attention.urgent', { count: urgentCount })}
                  </span>
                </>
              )}
            </p>
          )}
        </div>
        {attention.length ? (
          <ul className="border-border-subtle divide-border-subtle divide-y border-t">
            {attention.map((n, i) => {
              const urgent = n.tone === 'warning'
              return (
                <li
                  key={n.id}
                  className="motion-stagger"
                  style={{ '--i': i } as CSSProperties}
                >
                  <Link
                    to={n.to}
                    className={cn(
                      'group motion-interactive flex items-center gap-4 px-5 py-3.5 no-underline md:px-6',
                      urgent
                        ? 'bg-warning-soft/50 hover:bg-warning-soft'
                        : 'hover:bg-desk-2'
                    )}
                  >
                    <span
                      aria-hidden="true"
                      className={cn(
                        'rounded-control grid size-9 shrink-0 place-items-center',
                        urgent
                          ? 'bg-paper text-warning shadow-control'
                          : 'bg-sunken text-fg-muted'
                      )}
                    >
                      {urgent ? (
                        <AlertTriangle size={18} />
                      ) : (
                        <CircleDot size={18} />
                      )}
                    </span>
                    <span
                      className={cn(
                        'text-fg-strong min-w-0 flex-1 text-base',
                        urgent ? 'font-semibold' : 'font-medium'
                      )}
                    >
                      {n.text}
                    </span>
                    <span
                      aria-hidden="true"
                      className="text-fg-muted group-hover:text-fg-strong flex shrink-0 items-center gap-1 text-sm font-semibold"
                    >
                      <span className="hidden sm:inline">
                        {t('dashboard.attention.open')}
                      </span>
                      <ChevronRight
                        size={16}
                        className="motion-interactive group-hover:translate-x-0.5"
                      />
                    </span>
                  </Link>
                </li>
              )
            })}
          </ul>
        ) : (
          <div className="flex items-center gap-3">
            {allClear && (
              <span
                aria-hidden="true"
                className="bg-success-soft text-success rounded-control motion-draw grid size-9 shrink-0 place-items-center"
              >
                <Check size={18} />
              </span>
            )}
            <p
              className={
                allClear
                  ? 'text-fg-strong text-base font-medium'
                  : 'text-fg-muted text-sm'
              }
            >
              {loading
                ? t('dashboard.loading')
                : failed
                  ? t('dashboard.attention.unknown')
                  : nav.operationsUnavailable
                    ? t('dashboard.attention.emptyPartial')
                    : t('dashboard.attention.empty')}
            </p>
          </div>
        )}
        {/* Never imply all-clear for queues the dashboard cannot see */}
        {nav.operationsUnavailable && attention.length > 0 && (
          <p className="text-fg-muted border-border-subtle border-t px-5 py-3 text-sm md:px-6">
            {t('dashboard.attention.unavailable')}
          </p>
        )}
      </section>

      {hasLedger && (
        <aside
          aria-label={t('dashboard.kpi.title')}
          className={cn(
            'paper divide-border-subtle overflow-hidden divide-y',
            busy
              ? 'md:max-lg:grid md:max-lg:auto-cols-fr md:max-lg:grid-flow-col md:max-lg:divide-x md:max-lg:divide-y-0'
              : 'md:grid md:auto-cols-fr md:grid-flow-col md:divide-x md:divide-y-0'
          )}
        >
        {canReview && <KpiCard
          bare
          label={t('dashboard.kpi.pending')}
          value={applications.data && pending.length}
          failed={applications.isError}
          note={
            overdue.length
              ? t('dashboard.kpi.pendingOverdue', { count: overdue.length })
              : t('dashboard.kpi.pendingOnTime')
          }
          warn={overdue.length > 0}
          to="/reviewer/gate-1"
        />}
        {canApprove && <KpiCard
          bare
          label={t('dashboard.kpi.finalApproval')}
          value={nav.approvalPendingCount}
          failed={nav.queuesFailed}
          note={
            nav.approvalOverdueCount
              ? t('dashboard.kpi.finalApprovalOverdue', {
                  count: nav.approvalOverdueCount,
                })
              : t('dashboard.kpi.finalApprovalOnTime')
          }
          warn={!!nav.approvalOverdueCount}
          to="/admin/experts/approvals"
        />}
        {canApprove && <KpiCard
          bare
          label={t('dashboard.kpi.experts')}
          value={experts.data?.servingExperts}
          failed={experts.isError}
          note={t('dashboard.kpi.expertsNote', {
            suspended: experts.data?.suspendedExperts ?? 0,
            added: experts.data?.periods.at(-1)?.newExperts ?? 0,
          })}
          to="/admin/experts"
        />}
        {canSeeMoney && <KpiCard
          bare
          label={t('dashboard.kpi.held')}
          value={billing.data && held.amount}
          failed={billing.isError}
          unavailable={nav.operationsUnavailable}
          format={(n) => f.money(n)}
          note={t('dashboard.kpi.heldNote', { count: held.count })}
          unavailableNote={t('dashboard.kpi.moneyUnavailable')}
          to={nav.operationsUnavailable ? undefined : "/admin/escrow"}
        />}
        </aside>
      )}
      </div>

      {canSeeUsers && canSeeMoney && (
        <GrowthSection moneyUnavailable={nav.operationsUnavailable} />
      )}

      {/* Where work is stuck: which step applications pile up at, where money waits */}
      <div className="mt-6 grid gap-6 [grid-template-columns:repeat(auto-fit,minmax(min(100%,22rem),1fr))]">
        {canReview && <BarList
          id="dash-vetting"
          title={t('dashboard.vetting')}
          empty={
            applications.isError
              ? t('dashboard.kpi.failed')
              : t('dashboard.loading')
          }
          rows={!applications.data ? [] : QUEUE_TABS.map((tab) => {
            const count = apps.filter((a) =>
              (tab.statuses as readonly string[]).includes(a.status)
            ).length
            return {
              key: tab.label,
              label: t(tab.label),
              value: count,
              display: f.number(count),
            }
          })}
        />}
        {canSeeMoney && !nav.operationsUnavailable && <BarList
          id="dash-escrow"
          title={t('dashboard.escrow')}
          empty={
            billing.isError
              ? t('dashboard.kpi.failed')
              : loading
                ? t('dashboard.loading')
                : t('dashboard.noData')
          }
          rows={moneyRows.map((r) => ({
            key: r.key,
            label: moneyLabel(r.key, r.total),
            value: r.total.amount,
            display: f.money(r.total.amount),
            warn: r.warn,
          }))}
        />}

      {/* Coming up: platform fee changes announced ahead (the knowledge base is hidden: System Admin cannot see it) */}
      {canSetFees && <section className="paper p-5" aria-labelledby="dash-upcoming">
        <h2 id="dash-upcoming" className="text-h2">
          {t('dashboard.upcoming.title')}
        </h2>
        {scheduledFees.length ? (
          <ul className="divide-border-subtle mt-3 divide-y text-sm">
            {scheduledFees.map((fee) => (
              <li key={fee.serviceCode}>
                <Link
                  to="/admin/platform-fees"
                  className="hover:bg-desk-2 motion-interactive -mx-2 flex items-baseline gap-4 rounded px-2 py-2.5 no-underline"
                >
                  <span className="text-fg-muted num w-14 shrink-0">
                    {f.dateOnly(fee.pending!.effectiveFrom.slice(0, 10), {
                      day: '2-digit',
                      month: '2-digit',
                    })}
                  </span>
                  <span className="text-fg-strong">
                    {t('dashboard.upcoming.feeChange', {
                      service: fee.serviceName,
                      percent: fee.pending!.percent,
                    })}
                  </span>
                  <span className="text-accent-text ml-auto shrink-0 text-sm font-semibold whitespace-nowrap">
                    {whenLabel(daysUntil(fee.pending!.effectiveFrom))}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-fg-muted mt-3 text-sm">
            {t('dashboard.upcoming.empty')}
          </p>
        )}
      </section>}
      </div>
    </AdminLayout>
  )
}
