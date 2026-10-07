import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { CASE_STATUS } from '@/lib/constants'
import { cn, formatDayMonth } from '@/lib/utils'
import { StatusBadge } from '@/components/ui/display/status-badge'
import { AdminLayout } from '@/app/layouts/admin/AdminLayout'
import { useAdminNav } from '@/app/layouts/admin/useAdminNav'
import { DISPUTE_RESOLVED } from '../../features/disputes-escrow/constants'
import { useDisputes } from '../../features/disputes-escrow/hooks/useDispute'
import { disputeHoursLeft } from '../../features/disputes-escrow/utils/disputes'

const rowCls = 'border-border-subtle border-t [&>td]:px-4 [&>td]:py-3'
const headCls = 'bg-sunken text-fg-muted [&>th]:px-4 [&>th]:py-3 [&>th]:font-semibold'

/* Danh sách khiếu nại: đang mở lên trước, hạn trọng tài gần nhất trên cùng */
export default function AdminDisputesPage() {
  const nav = useAdminNav()
  const { data = [], isLoading, error } = useDisputes()
  const [now] = useState(() => Date.now())
  useEffect(() => {
    document.title = 'Khiếu nại | Shared Hub'
  }, [])

  const rows = data
    .map((d) => ({ ...d, hoursLeft: d.resolvedAt ? null : disputeHoursLeft(d.openedAt, now) }))
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
    <AdminLayout {...nav} section="disputes" breadcrumb="Khiếu nại">
      <h1 className="text-h1">Khiếu nại</h1>
      <p className="text-fg-muted mt-3">
        {openCount} khiếu nại đang chờ trọng tài. Mỗi khiếu nại phải có quyết định trong 48 giờ kể từ khi mở;
        tiền Escrow bị khóa tới lúc đó.
      </p>

      <section className="paper mt-8 overflow-x-auto">
        <table className="w-full min-w-220 text-sm">
          <thead>
            <tr className={headCls}>
              <th className="text-left">Mã hồ sơ</th>
              <th className="text-left">Hồ sơ</th>
              <th className="text-left">Căn cứ khiếu nại</th>
              <th className="text-left">Mở ngày</th>
              <th className="text-left">Trạng thái</th>
              <th className="text-right">Còn lại</th>
              <th>
                <span className="sr-only">Thao tác</span>
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
                <td className="num text-fg-muted">{formatDayMonth(d.openedAt)}</td>
                <td>
                  <StatusBadge status={d.resolvedAt ? DISPUTE_RESOLVED : CASE_STATUS.DISPUTED} />
                </td>
                <td
                  className={cn(
                    'num text-right',
                    d.hoursLeft !== null && d.hoursLeft <= 12 ? 'text-danger font-semibold' : 'text-fg-muted'
                  )}
                >
                  {d.hoursLeft === null ? '—' : `${d.hoursLeft} giờ`}
                </td>
                <td className="text-right">
                  <Link
                    to={`/admin/disputes/${d.id}`}
                    aria-label={`Xem chi tiết khiếu nại ${d.id}`}
                    className="btn btn-press btn-secondary no-underline"
                  >
                    Xem chi tiết
                  </Link>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr className="border-border-subtle border-t">
                <td colSpan={7} className="text-fg-muted px-4 py-10 text-center">
                  {isLoading ? 'Đang tải…' : (error?.message ?? 'Chưa có khiếu nại nào.')}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </AdminLayout>
  )
}
