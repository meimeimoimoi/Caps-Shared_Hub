import { Link } from 'react-router-dom'
import { TriangleAlert } from 'lucide-react'
import type { Paged } from '@/lib/utils'
import { TablePager } from '@/components/ui/table-pager'
import type { ExpertApplication } from '../types'
import { SLA_DAYS, formatDate, waitedDays } from '../utils/applications'

interface ApplicationsTableProps {
  paged: Paged<ExpertApplication>
  onPrev: () => void
  onNext: () => void
}

export function ApplicationsTable({
  paged,
  onPrev,
  onNext,
}: ApplicationsTableProps) {
  const { rows, total } = paged
  return (
    <section className="paper mt-4 overflow-x-auto">
      <div className="text-fg-muted flex justify-between px-4 py-3 text-sm">
        <span>Sắp xếp: nộp sớm nhất trước</span>
        <span>
          <span className="num">{total}</span> hồ sơ
        </span>
      </div>
      <table className="w-full min-w-[760px] text-sm">
        <thead className="bg-sunken text-fg-muted">
          <tr className="[&>th]:px-4 [&>th]:py-3 [&>th]:font-semibold">
            <th className="text-left">Người đăng ký</th>
            <th className="text-right">Số năm KN</th>
            <th className="text-left">Kết quả AI sàng lọc</th>
            <th className="text-right">Ngày nộp</th>
            <th className="text-right">Đã chờ</th>
            <th>
              <span className="sr-only">Thao tác</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((a) => {
            const days = waitedDays(a.submittedAt)
            return (
              <tr
                key={a.id}
                className="border-border-subtle border-t [&>td]:px-4 [&>td]:py-2"
              >
                <td>
                  <div className="text-fg-strong text-base font-semibold">
                    {a.name}
                  </div>
                  <div className="text-fg-muted">{a.email}</div>
                </td>
                <td className="num text-right">{a.years}</td>
                <td>
                  {a.aiFlags > 0 ? (
                    <span className="text-warning inline-flex items-center gap-1.5">
                      <TriangleAlert size={14} aria-hidden="true" />
                      <span className="num">{a.aiFlags}</span> mục cần xem lại
                    </span>
                  ) : (
                    <span className="text-fg-muted">Không có ghi chú</span>
                  )}
                </td>
                <td className="num text-right">{formatDate(a.submittedAt)}</td>
                <td className="text-right">
                  {days > SLA_DAYS ? (
                    <span className="text-warning inline-flex items-center gap-1.5">
                      <TriangleAlert size={14} aria-label="Quá hạn" />
                      <span className="num">{days}</span> ngày
                    </span>
                  ) : (
                    <>
                      <span className="num">{days}</span> ngày
                    </>
                  )}
                </td>
                <td className="text-right">
                  <Link
                    to={`/admin/experts/${a.id}`}
                    aria-label={`Xem chi tiết hồ sơ ${a.name}`}
                    className="btn btn-press btn-secondary no-underline"
                  >
                    Xem chi tiết
                  </Link>
                </td>
              </tr>
            )
          })}
          {rows.length === 0 && (
            <tr className="border-border-subtle border-t">
              <td colSpan={6} className="text-fg-muted px-4 py-10 text-center">
                Không có hồ sơ nào.
              </td>
            </tr>
          )}
        </tbody>
      </table>
      <TablePager paged={paged} onPrev={onPrev} onNext={onNext} />
    </section>
  )
}

