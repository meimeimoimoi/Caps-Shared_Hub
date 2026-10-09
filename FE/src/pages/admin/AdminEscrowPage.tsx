import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Download } from 'lucide-react'
import { ESCROW_STATUS } from '@/lib/constants'
import { cn, formatDayMonth } from '@/lib/utils'
import { formatVnd } from '@/lib/format-money'
import { StatusBadge } from '@/components/ui/display/status-badge'
import { SkeletonRows } from '@/components/ui/display/skeleton-rows'
import { Toast } from '@/components/ui/feedback/toast'
import { TablePager } from '@/components/ui/navigation/table-pager'
import { AdminLayout } from '@/app/layouts/admin/AdminLayout'
import { useAdminNav } from '@/app/layouts/admin/useAdminNav'
import {
  ESCROW_NEXT_LABEL,
  TERMINATION_MATRIX,
} from '../../features/disputes-escrow/constants'
import {
  ALL,
  useEscrows,
} from '../../features/disputes-escrow/hooks/useEscrows'
import { EscrowDrawer } from '../../features/disputes-escrow/components/EscrowDrawer'
import { escrowSplit } from '../../features/disputes-escrow/utils/escrow'
import { usePricing } from '../../features/service-pricing/hooks/usePricing'
import type { Escrow } from '../../features/disputes-escrow/types'

const rowCls = 'border-border-subtle border-t [&>td]:px-4 [&>td]:py-3'
const headCls =
  'bg-sunken text-fg-muted [&>th]:px-4 [&>th]:py-3 [&>th]:font-semibold'
/* Ô tổng chia 3 nhóm theo việc admin cần làm: lỗi (phải xử lý) → tiền đang giữ hộ → đã xong.
 * Không vẽ chart: tiền đang giữ (số tồn) và đã chi/hoàn (cộng dồn) không cộng thành một tổng có nghĩa. */
const GROUPS = [
  { key: 'action', statuses: ['PAYOUT_FAILED', 'REFUND_FAILED'] },
  { key: 'holding', statuses: ['HELD', 'DISPUTE_LOCKED', 'REFUND_PENDING'] },
  { key: 'done', statuses: ['PAID', 'REFUNDED'] },
] as const

/* Hoàn tiền và chi trả: tổng tiền theo trạng thái (bấm để lọc), bảng khoản tiền, chi tiết từng khoản, file đối soát */
export default function AdminEscrowPage() {
  const nav = useAdminNav()
  const { t } = useTranslation('admin')
  const escrows = useEscrows()
  const { paged, selected } = escrows
  // ponytail: tỷ lệ lấy từ cấu hình giá; 20 chỉ là giá trị dự phòng khi chưa tải xong
  const platformShare = usePricing().data?.platformShare ?? 20
  const [retrying, setRetrying] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const clearToast = useCallback(() => setToast(null), [])

  const retry = (caseId: string) => {
    setRetrying(caseId)
    escrows
      .retryPayout(caseId)
      .then(() => setToast(t('escrow.retried', { id: caseId })))
      .catch((e: Error) => setToast(e.message))
      .finally(() => setRetrying(null))
  }

  // Một nguồn cho nhãn trạng thái của trang này (nhãn chung trong lib/constants chưa dịch)
  const statusMeta = (s: Escrow['status']) => ({
    ...ESCROW_STATUS[s],
    label: t(`escrow.status.${s}`),
  })

  const exportCsv = () => {
    const cols = [
      'caseId',
      'client',
      'expert',
      'amount',
      'status',
      'toClient',
      'toExpert',
      'toPlatform',
      'paidAt',
      'payosRef',
      'refundRef',
    ] as const
    const lines = escrows.rows.map((e) => {
      const s = escrowSplit(e, platformShare)
      const v: Record<(typeof cols)[number], string | number> = {
        caseId: e.caseId,
        client: e.client,
        expert: e.expert,
        amount: e.amount,
        status: t(`escrow.status.${e.status}`),
        toClient: s.client,
        toExpert: s.expert,
        toPlatform: s.platform,
        paidAt: e.paidAt,
        payosRef: e.payosRef,
        refundRef: e.refundRef ?? '',
      }
      return cols
        .map((c) => `"${String(v[c]).replaceAll('"', '""')}"`)
        .join(',')
    })
    const header = cols.map((c) => `"${t(`escrow.csv.${c}`)}"`).join(',')
    // BOM để Excel đọc đúng tiếng Việt
    const url = URL.createObjectURL(
      new Blob(['\uFEFF' + [header, ...lines].join('\n')], {
        type: 'text/csv;charset=utf-8',
      })
    )
    const a = document.createElement('a')
    a.href = url
    a.download = `doi-soat-escrow-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <AdminLayout
      {...nav}
      section="escrow"
      breadcrumb={t('escrow.title')}
      search={escrows.query}
      searchLabel={t('escrow.searchLabel')}
      onSearchChange={escrows.setQuery}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-h1">{t('escrow.title')}</h1>
          <p className="text-fg-muted mt-3 max-w-[65ch]">{t('escrow.intro')}</p>
        </div>
        <button
          type="button"
          onClick={exportCsv}
          disabled={!escrows.rows.length}
          className="btn btn-press btn-secondary"
        >
          <Download size={16} aria-hidden="true" />
          {t('escrow.export')}
        </button>
      </div>

      {/* Ô tổng kiêm bộ lọc: bấm để xem khoản ở trạng thái đó, bấm lại để bỏ lọc */}
      <div
        role="group"
        aria-label={t('escrow.filterLabel')}
        className="mt-8 flex flex-wrap gap-x-6 gap-y-5"
      >
        {GROUPS.map((group) => {
          const sum = (s: Escrow['status']) =>
            escrows.matching
              .filter((e) => e.status === s)
              .reduce((n, e) => n + e.amount, 0)
          const count = (s: Escrow['status']) =>
            escrows.matching.filter((e) => e.status === s).length
          // Không có lỗi nào thì ẩn hẳn nhóm "Cần xử lý" cho đỡ nhiễu; trừ khi đang lọc theo nó
          // (vd. vừa thử lại thành công) để còn ô bấm bỏ lọc
          if (
            group.key === 'action' &&
            group.statuses.every((s) => count(s) === 0) &&
            !(group.statuses as readonly string[]).includes(escrows.status)
          )
            return null
          const holding = group.statuses.reduce((n, s) => n + sum(s), 0)
          return (
            <section
              key={group.key}
              aria-labelledby={`escrow-group-${group.key}`}
              className="min-w-64"
              // Nhóm nhiều ô thì rộng hơn
              style={{ flex: `${group.statuses.length} 1 0` }}
            >
              <div className="flex items-baseline justify-between gap-3">
                <h2
                  id={`escrow-group-${group.key}`}
                  className={cn(
                    'text-sm font-semibold',
                    group.key === 'action' ? 'text-danger' : 'text-fg-strong'
                  )}
                >
                  {t(`escrow.groups.${group.key}`)}
                </h2>
                {group.key === 'holding' && (
                  <span className="text-fg-muted num text-sm">
                    {t('escrow.groups.holdingTotal', {
                      amount: formatVnd(holding),
                    })}
                  </span>
                )}
              </div>
              <div
                // Màn rộng: mỗi trạng thái một cột; màn hẹp: xuống dòng thay vì ép số tiền tràn ô
                className="mt-2 grid [grid-template-columns:repeat(auto-fit,minmax(9.5rem,1fr))] gap-3 lg:[grid-template-columns:repeat(var(--cols),minmax(0,1fr))]"
                style={
                  { '--cols': group.statuses.length } as React.CSSProperties
                }
              >
                {group.statuses.map((s) => {
                  const active = escrows.status === s
                  const failed = group.key === 'action' && count(s) > 0
                  return (
                    <button
                      key={s}
                      type="button"
                      aria-pressed={active}
                      onClick={() => escrows.setStatus(active ? ALL : s)}
                      className={cn(
                        'paper motion-lift p-4 text-left',
                        active && 'outline-accent outline-2',
                        failed && 'border-l-danger border-l-4'
                      )}
                    >
                      <span className="text-fg-muted block text-sm">
                        {t(`escrow.status.${s}`)}
                      </span>
                      <span
                        className={cn(
                          'num mt-1 block font-semibold',
                          // Đã xong thì chữ nhỏ và nhạt hơn: không cần làm gì
                          group.key === 'done' ? 'text-fg text-lg' : 'text-xl',
                          failed
                            ? 'text-danger'
                            : group.key !== 'done' && 'text-fg-strong'
                        )}
                      >
                        {formatVnd(sum(s))}
                      </span>
                      <span className="text-fg-muted num block text-sm">
                        {t('escrow.items', { count: count(s) })}
                      </span>
                    </button>
                  )
                })}
              </div>
            </section>
          )
        })}
      </div>

      <section className="paper mt-6 overflow-x-auto">
        <table className="w-full min-w-200 text-sm">
          <thead>
            <tr className={headCls}>
              <th className="text-left">{t('escrow.col.caseId')}</th>
              <th className="text-left">{t('escrow.col.client')}</th>
              <th className="text-left">{t('escrow.col.expert')}</th>
              <th className="text-right">{t('escrow.col.amount')}</th>
              <th className="text-left">{t('escrow.col.status')}</th>
              <th className="text-right">{t('escrow.col.next')}</th>
              <th>
                <span className="sr-only">{t('escrow.col.actions')}</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {escrows.isLoading && <SkeletonRows cols={7} wide={0} />}
            {paged.rows.map((e) => (
              <tr
                key={e.caseId}
                className={cn(
                  rowCls,
                  selected?.caseId === e.caseId && 'bg-accent-soft'
                )}
              >
                <td className="num text-fg-strong">{e.caseId}</td>
                <td>{e.client}</td>
                <td>{e.expert}</td>
                <td className="num text-right">{formatVnd(e.amount)}</td>
                <td>
                  {e.status === 'REFUNDED' && e.termination ? (
                    <span className="text-fg-muted">
                      {t('escrow.refunded', {
                        reason: t(TERMINATION_MATRIX[e.termination].short),
                        percent: TERMINATION_MATRIX[e.termination].split[0],
                      })}
                    </span>
                  ) : (
                    <StatusBadge status={statusMeta(e.status)} />
                  )}
                </td>
                <td className="text-fg-muted text-right whitespace-nowrap">
                  {t(ESCROW_NEXT_LABEL[e.status])}{' '}
                  <span className="num">{formatDayMonth(e.nextAt)}</span>
                </td>
                <td className="text-right">
                  <button
                    type="button"
                    onClick={() => escrows.select(e.caseId)}
                    aria-label={t('escrow.viewLabel', { id: e.caseId })}
                    className="btn btn-press btn-secondary"
                  >
                    {t('escrow.view')}
                  </button>
                </td>
              </tr>
            ))}
            {!escrows.isLoading && paged.rows.length === 0 && (
              <tr className="border-border-subtle border-t">
                <td
                  colSpan={7}
                  className="text-fg-muted px-4 py-10 text-center"
                >
                  {escrows.error?.message ?? t('escrow.noMatch')}
                </td>
              </tr>
            )}
          </tbody>
        </table>
        <TablePager paged={paged} onPrev={escrows.prev} onNext={escrows.next} />
      </section>

      {/* Bảng tham chiếu cố định: gập lại để không chiếm chỗ của danh sách tiền */}
      <details className="motion-details paper mt-6">
        <summary className="text-fg-strong cursor-pointer px-4 py-3 font-semibold">
          {t('escrow.matrix.title')}
        </summary>
        <div className="overflow-x-auto">
          <table className="w-full min-w-150 text-sm">
            <thead>
              <tr className={headCls}>
                <th className="text-left">{t('escrow.matrix.case')}</th>
                <th className="text-right">{t('escrow.matrix.client')}</th>
                <th className="text-right">{t('escrow.matrix.expert')}</th>
                <th className="text-right">{t('escrow.matrix.platform')}</th>
              </tr>
            </thead>
            <tbody>
              {Object.values(TERMINATION_MATRIX).map((term) => (
                <tr key={term.label} className={rowCls}>
                  <td>{t(term.label)}</td>
                  {term.split.map((pct, i) => (
                    <td key={i} className="num text-right">
                      {pct}%
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>

      {selected && (
        <EscrowDrawer
          key={selected.caseId}
          escrow={selected}
          platformShare={platformShare}
          retrying={retrying === selected.caseId}
          onRetry={() => retry(selected.caseId)}
          onMarkRefunded={(ref) =>
            escrows
              .markRefunded(selected.caseId, ref)
              .then(() =>
                setToast(t('escrow.refund.done', { id: selected.caseId }))
              )
          }
          onClose={() => escrows.select(null)}
        />
      )}
      {toast && <Toast message={toast} onDone={clearToast} />}
    </AdminLayout>
  )
}
