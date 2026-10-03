import { Link } from 'react-router-dom'
import { TriangleAlert } from 'lucide-react'
import type { ExpertApplication } from '../types'
import { SLA_DAYS, formatDate, waitedDays } from '../utils/applications'

interface ApplicationsTableProps {
  rows: ExpertApplication[]
  total: number
  from: number
  to: number
  canPrev: boolean
  canNext: boolean
  onPrev: () => void
  onNext: () => void
}

export function ApplicationsTable({ rows, total, from, to, canPrev, canNext, onPrev, onNext }: ApplicationsTableProps) {
  return (
    <section className="bg-ex-panel mt-4 overflow-x-auto rounded-md">
      <div className="text-ex-muted flex justify-between px-4 py-3 text-xs">
        <span>Sắp xếp: nộp sớm nhất trước</span>
        <span>{total} hồ sơ</span>
      </div>
      <table className="w-full min-w-[760px] text-sm">
        <thead className="bg-ex-note-bg text-ex-muted text-xs">
          <tr className="[&>th]:px-4 [&>th]:py-3 [&>th]:font-semibold">
            <th className="text-left">Mã đơn</th>
            <th className="text-left">Người đăng ký</th>
            <th className="text-right">Số năm KN</th>
            <th className="text-left">Kết quả AI sàng lọc</th>
            <th className="text-right">Ngày nộp</th>
            <th className="text-right">Đã chờ</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((a) => {
            const days = waitedDays(a.submittedAt)
            return (
              <tr key={a.id} className="border-ex-border-light border-t [&>td]:px-4 [&>td]:py-2">
                <td>
                  {/* Trang chi tiết hồ sơ chưa làm */}
                  <Link
                    to={`/admin/experts/${a.id}`}
                    className="text-ex-accent font-medium underline underline-offset-4"
                  >
                    {a.id}
                  </Link>
                </td>
                <td>
                  <div className="font-semibold">{a.name}</div>
                  <div className="text-ex-muted text-xs">{a.email}</div>
                </td>
                <td className="text-right">{a.years}</td>
                <td className="text-xs">
                  {a.aiFlags > 0 ? (
                    <span className="text-ex-accent inline-flex items-center gap-1.5">
                      <TriangleAlert size={14} aria-hidden="true" />
                      {a.aiFlags} mục cần xem lại
                    </span>
                  ) : (
                    <span className="text-ex-muted">Không có ghi chú</span>
                  )}
                </td>
                <td className="text-right">{formatDate(a.submittedAt)}</td>
                <td className="text-right">
                  {days > SLA_DAYS ? (
                    <span className="text-ex-accent inline-flex items-center gap-1.5">
                      <TriangleAlert size={14} aria-label="Quá hạn" />
                      {days} ngày
                    </span>
                  ) : (
                    `${days} ngày`
                  )}
                </td>
              </tr>
            )
          })}
          {rows.length === 0 && (
            <tr className="border-ex-border-light border-t">
              <td colSpan={6} className="text-ex-muted px-4 py-10 text-center">
                Không có hồ sơ nào.
              </td>
            </tr>
          )}
        </tbody>
      </table>
      <div className="border-ex-border-light text-ex-muted flex items-center justify-between border-t px-4 py-3 text-xs">
        <span>
          Hiển thị {from}–{to} trên {total}
        </span>
        <div className="flex gap-2">
          {[
            { label: 'Trang trước', onClick: onPrev, disabled: !canPrev },
            { label: 'Trang sau', onClick: onNext, disabled: !canNext },
          ].map(({ label, onClick, disabled }) => (
            <button
              key={label}
              type="button"
              disabled={disabled}
              onClick={onClick}
              className="border-ex-border hover:bg-ex-btn-hover rounded-md border px-3 py-1.5 disabled:opacity-50 disabled:hover:bg-transparent"
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </section>
  )
}
