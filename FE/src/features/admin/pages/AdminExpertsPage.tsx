import { SERVICE_STATUS } from '@/shared/lib/constants'
import { StatusBadge } from '@/shared/ui/status-badge'
import { TablePager } from '@/shared/ui/table-pager'
import { AdminLayout } from '@/app/layouts/admin/AdminLayout'
import { formatDate } from '../model/utils/applications'
import { formatVnd } from '@/shared/lib/format-money'
import { mockApplications } from '../model/mockData'
import { useExperts, ALL } from '../hooks/useExperts'
import type { Expert } from '../model/types'

// MOCK: badge sidebar đếm từ mock, sau này lấy từ API
const pendingCount = mockApplications.filter(
  (a) => a.status === 'CAPABILITY_REVIEW'
).length

const selectCls =
  'border-border-control rounded-control shadow-control bg-paper h-control min-w-48 border px-3 text-sm'

export default function AdminExpertsPage() {
  const experts = useExperts()
  const { paged } = experts

  return (
    <AdminLayout
      section="experts"
      breadcrumb="Quản lý Expert"
      pendingCount={pendingCount}
      search={experts.query}
      onSearchChange={experts.setQuery}
    >
      <h1 className="text-h1">Quản lý Expert</h1>
      <p className="text-fg-muted mt-3">
        Expert đã được duyệt. Chỉ Expert có dịch vụ đang hoạt động mới hiển thị
        trên Marketplace.
      </p>

      <section className="paper mt-12 overflow-x-auto">
        <div className="flex flex-wrap items-end gap-4 px-4 py-3">
          <label className="flex flex-col gap-2 text-sm font-semibold">
            Trạng thái dịch vụ
            <select
              value={experts.status}
              onChange={(e) =>
                experts.setStatus(e.target.value as Expert['serviceStatus'])
              }
              className={selectCls}
            >
              <option value={ALL}>Tất cả</option>
              {Object.entries(SERVICE_STATUS).map(([key, s]) => (
                <option key={key} value={key}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-2 text-sm font-semibold">
            Lĩnh vực
            <select
              value={experts.field}
              onChange={(e) => experts.setField(e.target.value)}
              className={selectCls}
            >
              <option value={ALL}>Tất cả lĩnh vực</option>
              {experts.fields.map((f) => (
                <option key={f}>{f}</option>
              ))}
            </select>
          </label>
          <span className="text-fg-muted ml-auto text-sm">
            <span className="num">{paged.total}</span> Expert
          </span>
        </div>

        <table className="w-full min-w-200 text-sm">
          <thead className="bg-sunken text-fg-muted">
            <tr className="[&>th]:px-4 [&>th]:py-3 [&>th]:font-semibold">
              <th className="text-left">Expert</th>
              <th className="text-left">Lĩnh vực</th>
              <th className="text-left">Trạng thái dịch vụ</th>
              <th className="text-right">Phí rà soát</th>
              <th className="text-right">Đang nhận</th>
              <th className="text-right">Ngày duyệt</th>
            </tr>
          </thead>
          <tbody>
            {paged.rows.map((e) => (
              <tr
                key={e.id}
                className="border-border-subtle border-t [&>td]:px-4 [&>td]:py-2"
              >
                <td>
                  {/* TODO: trang chi tiết Expert chưa có thiết kế */}
                  <div className="text-fg-strong text-base font-semibold">
                    {e.name}
                  </div>
                  <div className="text-fg-muted">{e.email}</div>
                </td>
                <td>{e.fields.join(', ')}</td>
                <td>
                  <StatusBadge status={SERVICE_STATUS[e.serviceStatus]} />
                </td>
                <td className="num text-right">
                  {e.fee === null ? '—' : formatVnd(e.fee)}
                </td>
                <td className="num text-right">
                  {e.activeCases}/{e.capacity}
                </td>
                <td className="num text-right">{formatDate(e.approvedAt)}</td>
              </tr>
            ))}
            {paged.rows.length === 0 && (
              <tr className="border-border-subtle border-t">
                <td
                  colSpan={6}
                  className="text-fg-muted px-4 py-10 text-center"
                >
                  Không có Expert nào khớp bộ lọc.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        <TablePager paged={paged} onPrev={experts.prev} onNext={experts.next} />
      </section>
    </AdminLayout>
  )
}
