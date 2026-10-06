import { Link } from 'react-router-dom'
import { ESCROW_STATUS } from '@/lib/constants'
import { StatusBadge } from '@/components/ui/display/status-badge'
import { AdminLayout } from '@/app/layouts/admin/AdminLayout'
import {
  ESCROW_NEXT_LABEL,
  TERMINATION_MATRIX,
} from '../../features/disputes-escrow/constants'
import { useAdminNav } from '@/app/layouts/admin/useAdminNav'
import { useEscrows } from '../../features/disputes-escrow/hooks/useEscrows'
import { formatDayMonth } from '@/lib/utils'
import type { Escrow } from '../../features/disputes-escrow/types'

const rowCls = 'border-border-subtle border-t [&>td]:px-4 [&>td]:py-3'
const headCls =
  'bg-sunken text-fg-muted [&>th]:px-4 [&>th]:py-3 [&>th]:font-semibold'

/* Hoàn tiền do chấm dứt → "Hủy sớm · hoàn 50%"; còn lại dùng nhãn trạng thái */
function EscrowStatus({ e }: { e: Escrow }) {
  if (e.status === 'REFUNDED' && e.termination) {
    const t = TERMINATION_MATRIX[e.termination]
    return (
      <span className="text-fg-muted">
        {t.short} · hoàn <span className="num">{t.split[0]}%</span>
      </span>
    )
  }
  return <StatusBadge status={ESCROW_STATUS[e.status]} />
}

export default function AdminEscrowPage() {
  const nav = useAdminNav()
  const { data: escrows = [], isLoading, error } = useEscrows()

  return (
    <AdminLayout {...nav} section="escrow" breadcrumb="Escrow và chi trả">
      <h1 className="text-h1">Escrow và chi trả</h1>
      <p className="text-fg-muted mt-3">
        Chi trả 80/20 sau nghiệm thu; hoàn tiền theo ma trận chấm dứt và quyết
        định tranh chấp.
      </p>

      <section className="paper mt-12 overflow-x-auto">
        <table className="w-full min-w-200 text-sm">
          <thead>
            <tr className={headCls}>
              <th className="text-left">Mã hồ sơ</th>
              <th className="text-left">Client</th>
              <th className="text-left">Chuyên gia</th>
              <th className="text-right">Số tiền (₫)</th>
              <th className="text-left">Trạng thái Escrow</th>
              <th className="text-right">Mốc tiếp theo</th>
            </tr>
          </thead>
          <tbody>
            {escrows.map((e) => (
              <tr key={e.caseId} className={rowCls}>
                <td className="num">
                  {/* Chỉ hồ sơ tranh chấp mới có trang chi tiết phía admin */}
                  {e.status === 'DISPUTE_LOCKED' ? (
                    <Link
                      to={`/admin/disputes/${e.caseId}`}
                      className="text-fg-strong underline underline-offset-4"
                    >
                      {e.caseId}
                    </Link>
                  ) : (
                    e.caseId
                  )}
                </td>
                <td>{e.client}</td>
                <td>{e.expert}</td>
                <td className="num text-right">
                  {e.amount.toLocaleString('vi-VN')}
                </td>
                <td>
                  <EscrowStatus e={e} />
                </td>
                <td className="text-fg-muted text-right">
                  {ESCROW_NEXT_LABEL[e.status]}{' '}
                  <span className="num">{formatDayMonth(e.nextAt)}</span>
                </td>
              </tr>
            ))}
            {escrows.length === 0 && (
              <tr className="border-border-subtle border-t">
                <td colSpan={6} className="text-fg-muted px-4 py-10 text-center">
                  {isLoading
                    ? 'Đang tải…'
                    : (error?.message ?? 'Chưa có khoản Escrow nào.')}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      <h2 className="text-h2 mt-12">Ma trận chấm dứt hồ sơ</h2>
      <section className="paper mt-4 overflow-x-auto">
        <table className="w-full min-w-150 text-sm">
          <thead>
            <tr className={headCls}>
              <th className="text-left">Tình huống chấm dứt</th>
              <th className="text-right">Hoàn Client</th>
              <th className="text-right">Chuyên gia</th>
              <th className="text-right">Nền tảng</th>
            </tr>
          </thead>
          <tbody>
            {Object.values(TERMINATION_MATRIX).map((t) => (
              <tr key={t.label} className={rowCls}>
                <td>{t.label}</td>
                {t.split.map((pct, i) => (
                  <td key={i} className="num text-right">
                    {pct}%
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </AdminLayout>
  )
}
