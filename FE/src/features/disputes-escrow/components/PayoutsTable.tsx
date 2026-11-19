import { SortableTh } from '@/components/ui/navigation/sortable-th'
import { useTranslation } from 'react-i18next'
import { formatDateTime } from '@/lib/utils'
import { formatVnd } from '@/lib/format-money'
import { StatusBadge } from '@/components/ui/display/status-badge'
import { SkeletonRows } from '@/components/ui/display/skeleton-rows'
import { Pagination } from '@/components/ui/navigation/pagination'
import { PAYOUT_PAGE_SIZE } from '../api/payoutsApi'
import { usePayouts } from '../hooks/usePayouts'

const headCls =
  'bg-sunken text-fg-muted [&>th]:px-4 [&>th]:py-3 [&>th]:font-semibold'
const rowCls = 'border-border-subtle border-t align-top [&>td]:px-4 [&>td]:py-3'
const inputCls =
  'border-border-control rounded-control shadow-control bg-paper h-control border px-3 text-sm font-normal'

// Billing only creates PENDING payouts until transfers are built; other states show as sent
const STATUSES = ['PENDING'] as const

/* Transfers owed to experts after an escrow is released; the bank details are the snapshot taken then */
export function PayoutsTable() {
  const { t } = useTranslation('admin')
  const payouts = usePayouts()
  const items = payouts.data?.items ?? []
  const total = payouts.data?.total ?? 0
  const statusLabel = (s: string) =>
    s === 'PENDING' ? t('payouts.status.PENDING') : s

  return (
    <section className="mt-6" aria-labelledby="payouts-title">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h2 id="payouts-title" className="text-h2">
          {t('payouts.title')}
        </h2>
        <label className="flex flex-col gap-1.5 text-sm font-semibold">
          {t('payouts.filter')}
          <select
            value={payouts.status ?? ''}
            onChange={(e) => payouts.setStatus(e.target.value || null)}
            className={inputCls}
          >
            <option value="">{t('payouts.all')}</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {statusLabel(s)}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="paper mt-3 overflow-x-auto">
        <table className="w-full min-w-200 text-sm">
          <thead>
            <tr className={headCls}>
              <SortableTh
                className="text-left"
                column="createdAt"
                sort={payouts.sort}
                onSort={payouts.onSort}
              >
                {t('payouts.col.createdAt')}
              </SortableTh>
              <th className="text-left">{t('payouts.col.recipient')}</th>
              <th className="text-left">{t('payouts.col.account')}</th>
              <SortableTh
                className="text-right"
                column="amount"
                sort={payouts.sort}
                onSort={payouts.onSort}
              >
                {t('payouts.col.amount')}
              </SortableTh>
              <th className="text-left">{t('payouts.col.status')}</th>
            </tr>
          </thead>
          <tbody>
            {payouts.isLoading && <SkeletonRows cols={5} />}
            {items.map((p) => (
              <tr key={p.id} className={rowCls}>
                <td className="num whitespace-nowrap">
                  {formatDateTime(p.createdAt)}
                </td>
                <td className="num text-fg-muted break-all">
                  {p.recipientUserId}
                </td>
                <td>
                  {p.bankName ? (
                    <>
                      <p className="text-fg-strong">
                        {p.bankName}{' '}
                        <span className="num">•••• {p.accountLast4}</span>
                      </p>
                      <p className="text-fg-muted">{p.holderName}</p>
                    </>
                  ) : (
                    <span className="text-warning">
                      {t('payouts.noAccount')}
                    </span>
                  )}
                </td>
                <td className="num text-right">{formatVnd(p.amount)}</td>
                <td>
                  <StatusBadge
                    status={{
                      label: statusLabel(p.status),
                      tone: p.status === 'PENDING' ? 'warning' : 'neutral',
                    }}
                  />
                  {p.lastError && (
                    <p className="text-danger mt-1">{p.lastError}</p>
                  )}
                </td>
              </tr>
            ))}
            {!payouts.isLoading && items.length === 0 && (
              <tr className="border-border-subtle border-t">
                <td
                  colSpan={5}
                  className="text-fg-muted px-4 py-10 text-center"
                >
                  {payouts.error?.message ?? t('payouts.empty')}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {total > PAYOUT_PAGE_SIZE && (
        <div className="mt-3">
          <Pagination
            page={payouts.page}
            pageSize={PAYOUT_PAGE_SIZE}
            total={total}
            onPageChange={payouts.setPage}
            label={t('payouts.title')}
          />
        </div>
      )}
    </section>
  )
}
