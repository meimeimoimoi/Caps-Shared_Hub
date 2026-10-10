import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { CASE_STATUS } from '@/lib/constants'
import { cn, formatDayMonth } from '@/lib/utils'
import { StatusBadge } from '@/components/ui/display/status-badge'
import { SkeletonRows } from '@/components/ui/display/skeleton-rows'
import { AdminLayout } from '@/app/layouts/admin/AdminLayout'
import { useAdminNav } from '@/app/layouts/admin/useAdminNav'
import {
  DISPUTE_RESOLVED,
  DISPUTE_SLA_HOURS,
} from '../../features/disputes-escrow/constants'
import { useDisputes } from '../../features/disputes-escrow/hooks/useDispute'
import { disputeHoursLeft } from '../../features/disputes-escrow/utils/disputes'

const rowCls = 'border-border-subtle border-t [&>td]:px-4 [&>td]:py-3'
const headCls =
  'bg-sunken text-fg-muted [&>th]:px-4 [&>th]:py-3 [&>th]:font-semibold'

/* Danh sách khiếu nại: đang mở lên trước, hạn trọng tài gần nhất trên cùng */
export default function AdminDisputesPage() {
  const nav = useAdminNav()
  const { t } = useTranslation('admin')
  const { data = [], isLoading, error } = useDisputes()
  const [now] = useState(() => Date.now())

  const rows = data
    .map((d) => ({
      ...d,
      hoursLeft: d.resolvedAt ? null : disputeHoursLeft(d.openedAt, now),
    }))
    .sort((a, b) =>
      a.hoursLeft !== null && b.hoursLeft !== null
        ? a.hoursLeft - b.hoursLeft
        : a.hoursLeft !== null
          ? -1
          : b.hoursLeft !== null
            ? 1
            : b.resolvedAt!.localeCompare(a.resolvedAt!)
    )
  const openCount = rows.filter((r) => r.hoursLeft !== null).length

  return (
    <AdminLayout {...nav} section="disputes" breadcrumb={t('disputes.title')}>
      <h1 className="text-h1">{t('disputes.title')}</h1>
      <p className="text-fg-muted mt-3">
        {t('disputes.intro', { count: openCount, hours: DISPUTE_SLA_HOURS })}
      </p>

      <section className="paper mt-8 overflow-x-auto">
        <table className="w-full min-w-220 text-sm">
          <thead>
            <tr className={headCls}>
              <th className="text-left">{t('disputes.col.caseId')}</th>
              <th className="text-left">{t('disputes.col.case')}</th>
              <th className="text-left">{t('disputes.col.ground')}</th>
              <th className="text-left">{t('disputes.col.opened')}</th>
              <th className="text-left">{t('disputes.col.status')}</th>
              <th className="text-right">{t('disputes.col.left')}</th>
              <th>
                <span className="sr-only">{t('disputes.col.actions')}</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((d) => (
              <tr key={d.id} className={rowCls}>
                <td className="num text-fg-strong">{d.id}</td>
                <td>
                  <p className="text-fg-strong">{d.title}</p>
                  <p className="text-fg-muted text-caption">
                    {d.client} · {d.expert}
                  </p>
                </td>
                <td>{d.ground}</td>
                <td className="num text-fg-muted">
                  {formatDayMonth(d.openedAt)}
                </td>
                <td>
                  <StatusBadge
                    status={
                      d.resolvedAt
                        ? {
                            ...DISPUTE_RESOLVED,
                            label: t(DISPUTE_RESOLVED.label),
                          }
                        : CASE_STATUS.DISPUTED
                    }
                  />
                </td>
                <td
                  className={cn(
                    'num text-right',
                    d.hoursLeft !== null && d.hoursLeft <= 12
                      ? 'text-danger font-semibold'
                      : 'text-fg-muted'
                  )}
                >
                  {d.hoursLeft === null
                    ? '—'
                    : t('disputes.hours', { hours: d.hoursLeft })}
                </td>
                <td className="text-right">
                  <Link
                    to={`/admin/disputes/${d.id}`}
                    aria-label={t('disputes.viewLabel', { id: d.id })}
                    className="btn btn-press btn-secondary no-underline"
                  >
                    {t('disputes.view')}
                  </Link>
                </td>
              </tr>
            ))}
            {isLoading && <SkeletonRows cols={7} />}
            {!isLoading && rows.length === 0 && (
              <tr className="border-border-subtle border-t">
                <td
                  colSpan={7}
                  className="text-fg-muted px-4 py-10 text-center"
                >
                  {error?.message ?? t('disputes.empty')}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </AdminLayout>
  )
}
