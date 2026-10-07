import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { ESCROW_STATUS } from '@/lib/constants'
import { useFormatters } from '@/hooks/useFormatters'
import { AdminLayout } from '@/app/layouts/admin/AdminLayout'
import { useAdminNav } from '@/app/layouts/admin/useAdminNav'
import { getApplications, getExperts } from '../../features/expert-vetting/api/adminApi'
import { adminKeys } from '../../features/expert-vetting/api/queryKeys'
import { QUEUE_TABS } from '../../features/expert-vetting/constants'
import { SLA_DAYS, waitedDays } from '../../features/expert-vetting/utils/applications'
import { getDisputes, getEscrows } from '../../features/disputes-escrow/api/disputesApi'
import { disputesKeys } from '../../features/disputes-escrow/api/queryKeys'
import { disputeHoursLeft } from '../../features/disputes-escrow/utils/disputes'
import { usePricing } from '../../features/service-pricing/hooks/usePricing'
import { AttentionList, type AttentionItem } from '../../features/admin-analytics/components/AttentionList'
import { BarList } from '../../features/admin-analytics/components/BarList'
import { GrowthSection } from '../../features/admin-analytics/components/GrowthSection'
import { KpiCard } from '../../features/admin-analytics/components/KpiCard'

/* Tổng quan System Admin: việc gấp trước, chỉ số sau. Số liệu dùng chung cache với các màn chi tiết */
export default function AdminDashboardPage() {
  const nav = useAdminNav()
  const { t } = useTranslation('admin')
  const f = useFormatters()
  const [now] = useState(() => Date.now())
  useEffect(() => {
    document.title = `${t('dashboard.title')} | Shared Hub`
  }, [t])

  const applications = useQuery({ queryKey: adminKeys.applications(), queryFn: ({ signal }) => getApplications(signal) })
  const experts = useQuery({ queryKey: adminKeys.experts(), queryFn: ({ signal }) => getExperts(signal) })
  const disputes = useQuery({ queryKey: disputesKeys.disputes(), queryFn: ({ signal }) => getDisputes(signal) })
  const escrows = useQuery({ queryKey: disputesKeys.escrows(), queryFn: ({ signal }) => getEscrows(signal) })
  const pricing = usePricing()
  const loading = [applications, experts, disputes, escrows, pricing].some((q) => q.isLoading)

  const apps = applications.data ?? []
  const pending = apps.filter((a) => a.status === 'CAPABILITY_REVIEW')
  const overdue = pending.filter((a) => waitedDays(a.submittedAt, now) > SLA_DAYS)

  const expertList = experts.data ?? []
  const active = expertList.filter((e) => e.serviceStatus === 'ACTIVE').length
  const suspended = expertList.filter((e) => e.serviceStatus === 'SUSPENDED').length

  const open = (disputes.data ?? []).filter((d) => !d.resolvedAt)
  const nearestHours = open.length ? Math.min(...open.map((d) => disputeHoursLeft(d.openedAt, now))) : null

  const escrowList = escrows.data ?? []
  const sumBy = (status: keyof typeof ESCROW_STATUS) =>
    escrowList.filter((e) => e.status === status).reduce((s, e) => s + e.amount, 0)
  const locked = sumBy('DISPUTE_LOCKED')
  const payoutFailed = escrowList.filter((e) => e.status === 'PAYOUT_FAILED').length

  const tiers = pricing.data?.tiers ?? []
  const outsideRange = tiers.reduce((s, tier) => s + tier.outsideRange, 0)
  const scheduled = tiers.filter((tier) => tier.scheduled)

  // Việc gấp, sắp theo mức độ: tiền và hạn trọng tài trước, cảnh báo nhẹ sau
  const attention = [
    nearestHours !== null && {
      text: t('dashboard.attention.dispute', { count: open.length, hours: nearestHours }),
      to: '/admin/disputes',
      tone: 'warning',
    },
    payoutFailed > 0 && {
      text: t('dashboard.attention.payoutFailed', { count: payoutFailed }),
      to: '/admin/escrow',
      tone: 'danger',
    },
    overdue.length > 0 && {
      text: t('dashboard.attention.slaOverdue', { count: overdue.length, days: SLA_DAYS }),
      to: '/admin/experts/pending',
      tone: 'warning',
    },
    outsideRange > 0 && {
      text: t('dashboard.attention.outsideRange', { count: outsideRange }),
      to: '/admin/pricing',
    },
  ].filter((a): a is AttentionItem => !!a)

  return (
    <AdminLayout {...nav} section="overview" breadcrumb={t('navigation.overview')}>
      <h1 className="text-h1">{t('dashboard.title')}</h1>
      <p className="text-fg-muted mt-3">{t('dashboard.description')}</p>

      <AttentionList items={attention} loading={loading} />

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label={t('dashboard.kpi.pending')}
          value={f.number(pending.length)}
          note={
            overdue.length
              ? t('dashboard.kpi.pendingOverdue', { count: overdue.length })
              : t('dashboard.kpi.pendingOnTime')
          }
          warn={overdue.length > 0}
          to="/admin/experts/pending"
        />
        <KpiCard
          label={t('dashboard.kpi.experts')}
          value={f.number(active)}
          note={t('dashboard.kpi.expertsNote', { suspended, total: expertList.length })}
          to="/admin/experts"
        />
        <KpiCard
          label={t('dashboard.kpi.held')}
          value={f.money(sumBy('HELD') + locked)}
          note={t('dashboard.kpi.heldNote', { amount: f.money(locked) })}
          warn={locked > 0}
          to="/admin/escrow"
        />
        <KpiCard
          label={t('dashboard.kpi.disputes')}
          value={f.number(open.length)}
          note={
            nearestHours !== null
              ? t('dashboard.kpi.disputesNote', { hours: nearestHours })
              : t('dashboard.kpi.disputesNone')
          }
          warn={nearestHours !== null}
          to="/admin/disputes"
        />
      </div>

      <GrowthSection />

      {/* Chỗ đang tắc: hồ sơ dồn ở bước nào, tiền kẹt ở đâu */}
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <BarList
          id="dash-vetting"
          title={t('dashboard.vetting')}
          empty={loading ? t('dashboard.loading') : t('dashboard.noData')}
          rows={QUEUE_TABS.map((tab) => {
            const count = apps.filter((a) => (tab.statuses as readonly string[]).includes(a.status)).length
            return { key: tab.label, label: t(tab.label), value: count, display: f.number(count) }
          })}
        />
        <BarList
          id="dash-escrow"
          title={t('dashboard.escrow')}
          empty={loading ? t('dashboard.loading') : t('dashboard.noData')}
          rows={(Object.keys(ESCROW_STATUS) as (keyof typeof ESCROW_STATUS)[])
            .map((status) => ({ status, amount: sumBy(status) }))
            .filter((r) => r.amount > 0)
            .map((r) => ({
              key: r.status,
              label: ESCROW_STATUS[r.status].label,
              value: r.amount,
              display: f.money(r.amount),
              warn: r.status === 'PAYOUT_FAILED',
            }))}
        />
      </div>

      {/* Sắp diễn ra (kho tri thức không hiện: System Admin không có quyền xem) */}
      <section className="paper mt-6 p-5" aria-labelledby="dash-upcoming">
        <h2 id="dash-upcoming" className="text-h2">
          {t('dashboard.upcoming.title')}
        </h2>
        {scheduled.length ? (
          <ul className="divide-border-subtle mt-3 divide-y text-sm">
            {scheduled.map((tier) => (
              <li key={tier.id}>
                <Link
                  to={`/admin/pricing/${tier.id}`}
                  className="hover:bg-desk-2 -mx-2 flex gap-4 rounded px-2 py-2.5 no-underline"
                >
                  <span className="text-fg-muted num w-14 shrink-0">
                    {f.dateOnly(tier.scheduled!.effectiveFrom.slice(0, 10), { day: '2-digit', month: '2-digit' })}
                  </span>
                  <span className="text-fg-strong">{t('dashboard.upcoming.priceChange', { group: tier.group })}</span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-fg-muted mt-3 text-sm">{t('dashboard.upcoming.empty')}</p>
        )}
      </section>
    </AdminLayout>
  )
}
