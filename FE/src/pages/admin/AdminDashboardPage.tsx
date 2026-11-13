import { useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, ChevronRight, CircleDot } from 'lucide-react'
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
  const failed = [applications, experts, billing, fees].some((q) => q.isError)

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
        { key: 'held', total: held },
        ...billing.data.payouts.map((p) => ({ key: `payout-${p.status}`, total: p })),
        { key: 'refunded', total: find(billing.data.escrows, 'REFUNDED') },
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

  return (
    <AdminLayout
      {...nav}
      section="overview"
      breadcrumb={t('navigation.overview')}
    >
      <PageHeader title={t('dashboard.title')} />
      {failed && <LoadError className="paper mt-8 px-4 py-6" />}

      <section className="paper mt-8 p-5" aria-labelledby="dash-attention">
        <h2 id="dash-attention" className="text-h2">
          {t('dashboard.attention.title')}
        </h2>
        {nav.notifications.length ? (
          <ul className="divide-border-subtle mt-3 divide-y text-sm">
            {nav.notifications.map((n) => (
              <li key={n.id}>
                <Link
                  to={n.to}
                  className="hover:bg-desk-2 -mx-2 flex items-center gap-3 rounded px-2 py-2.5 no-underline"
                >
                  {n.tone === 'warning' ? (
                    <AlertTriangle
                      size={16}
                      aria-hidden="true"
                      className="text-warning shrink-0"
                    />
                  ) : (
                    <CircleDot
                      size={16}
                      aria-hidden="true"
                      className="text-fg-muted shrink-0"
                    />
                  )}
                  <span className="text-fg-strong min-w-0 flex-1">{n.text}</span>
                  <ChevronRight
                    size={16}
                    aria-hidden="true"
                    className="text-fg-muted shrink-0"
                  />
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-fg-muted mt-3 text-sm">
            {loading ? t('dashboard.loading') : t('dashboard.attention.empty')}
          </p>
        )}
      </section>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {canReview && <KpiCard
          label={t('dashboard.kpi.pending')}
          value={applications.data && pending.length}
          note={
            overdue.length
              ? t('dashboard.kpi.pendingOverdue', { count: overdue.length })
              : t('dashboard.kpi.pendingOnTime')
          }
          warn={overdue.length > 0}
          to="/reviewer/gate-1"
        />}
        {canApprove && <KpiCard
          label={t('dashboard.kpi.experts')}
          value={experts.data?.servingExperts}
          note={t('dashboard.kpi.expertsNote', {
            suspended: experts.data?.suspendedExperts ?? 0,
            added: experts.data?.periods.at(-1)?.newExperts ?? 0,
          })}
          to="/admin/experts"
        />}
        {canSeeMoney && <KpiCard
          label={t('dashboard.kpi.held')}
          value={billing.data && held.amount}
          format={(n) => f.money(n)}
          note={t('dashboard.kpi.heldNote', { count: held.count })}
          to="/admin/escrow"
        />}
      </div>

      {canSeeUsers && canSeeMoney && <GrowthSection />}

      {/* Where work is stuck: which step applications pile up at, where money waits */}
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {canReview && <BarList
          id="dash-vetting"
          title={t('dashboard.vetting')}
          empty={loading ? t('dashboard.loading') : t('dashboard.noData')}
          rows={QUEUE_TABS.map((tab) => {
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
        {canSeeMoney && <BarList
          id="dash-escrow"
          title={t('dashboard.escrow')}
          empty={loading ? t('dashboard.loading') : t('dashboard.noData')}
          rows={moneyRows.map((r) => ({
            key: r.key,
            label: moneyLabel(r.key, r.total),
            value: r.total.amount,
            display: f.money(r.total.amount),
          }))}
        />}
      </div>

      {/* Coming up: platform fee changes announced ahead (the knowledge base is hidden: System Admin cannot see it) */}
      {canSetFees && <section className="paper mt-6 p-5" aria-labelledby="dash-upcoming">
        <h2 id="dash-upcoming" className="text-h2">
          {t('dashboard.upcoming.title')}
        </h2>
        {scheduledFees.length ? (
          <ul className="divide-border-subtle mt-3 divide-y text-sm">
            {scheduledFees.map((fee) => (
              <li key={fee.serviceCode}>
                <Link
                  to="/admin/platform-fees"
                  className="hover:bg-desk-2 -mx-2 flex gap-4 rounded px-2 py-2.5 no-underline"
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
    </AdminLayout>
  )
}
