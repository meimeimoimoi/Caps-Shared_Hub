import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { formatDateTime } from '@/lib/utils'
import { formatVnd } from '@/lib/format-money'
import { Button } from '@/components/ui/actions/button'
import { StatusBadge } from '@/components/ui/display/status-badge'
import { SkeletonRows } from '@/components/ui/display/skeleton-rows'
import { Toast } from '@/components/ui/feedback/toast'
import {
  errorToast,
  type ToastContent,
} from '@/components/ui/feedback/toast-content'
import { Pagination } from '@/components/ui/navigation/pagination'
import {
  PAYOUT_PAGE_SIZE,
  type Payout,
  type PayoutStatus,
} from '../api/payoutsApi'
import { usePayouts } from '../hooks/usePayouts'

const headCls =
  'bg-sunken text-fg-muted [&>th]:px-4 [&>th]:py-3 [&>th]:font-semibold'
const rowCls = 'border-border-subtle border-t align-top [&>td]:px-4 [&>td]:py-3'
const inputCls =
  'border-border-control rounded-control shadow-control bg-paper h-control border px-3 text-sm font-normal'

const STATUSES: PayoutStatus[] = [
  'PENDING',
  'PROCESSING',
  'SUCCEEDED',
  'FAILED',
]
const TONES = {
  PENDING: 'warning',
  PROCESSING: 'accent',
  SUCCEEDED: 'success',
  FAILED: 'danger',
} as const

// Where an unsent payout stands against its hold and deadline (advisor 2026-11-28)
type Stage = 'overdue' | 'dueSoon' | 'ready' | 'holding' | 'waitingAccount'
const STAGE_TONES = {
  overdue: 'text-danger font-semibold',
  dueSoon: 'text-warning font-semibold',
  ready: 'text-fg',
  holding: 'text-fg-muted',
  waitingAccount: 'text-warning',
} as const
const stageOf = (p: Payout, now: number): Stage | null => {
  if (p.status !== 'PENDING' && p.status !== 'FAILED') return null
  if (now < new Date(p.transferableFrom).getTime()) return 'holding'
  // No verified account yet: the deadline waits until staff verify one
  if (!p.dueAt || !p.remindAt) return 'waitingAccount'
  if (now > new Date(p.dueAt).getTime()) return 'overdue'
  if (now > new Date(p.remindAt).getTime()) return 'dueSoon'
  return 'ready'
}

/* Transfers owed to experts after an escrow is released; staff send them through PayOS payouts */
export function PayoutsTable() {
  const { t } = useTranslation(['admin', 'common'])
  const payouts = usePayouts()
  const items = payouts.data?.items ?? []
  const total = payouts.data?.total ?? 0
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [toast, setToast] = useState<ToastContent | null>(null)
  // Read once per mount: a hold ending while the page is open shows after a refresh
  const [now] = useState(Date.now)
  const clearToast = useCallback(() => setToast(null), [])
  const statusLabel = (s: string) =>
    STATUSES.includes(s as PayoutStatus)
      ? t(`payouts.status.${s as PayoutStatus}`)
      : s

  const stageLine = (p: Payout) => {
    const stage = stageOf(p, now)
    return (
      stage && (
        <p className={`mt-1 ${STAGE_TONES[stage]}`}>
          {t(`payouts.stage.${stage}`, {
            date: p.dueAt ? formatDateTime(p.dueAt) : '',
          })}
        </p>
      )
    )
  }

  const run = (p: Payout, call: (id: string) => Promise<Payout>) => {
    setConfirmId(null)
    setBusyId(p.id)
    call(p.id)
      .then((next) =>
        setToast(
          next.status === 'FAILED'
            ? errorToast(t('payouts.result.FAILED'))
            : t(`payouts.result.${next.status}`)
        )
      )
      .catch((e: Error) =>
        setToast(errorToast(e.message || t('common:states.actionFailed')))
      )
      .finally(() => setBusyId(null))
  }

  const actions = (p: Payout) => {
    const busy = busyId === p.id
    if (p.status === 'PROCESSING')
      return (
        <Button
          size="sm"
          variant="outline"
          disabled={busy}
          onClick={() => run(p, payouts.refresh)}
        >
          {t('payouts.refresh')}
        </Button>
      )
    if (p.status !== 'PENDING' && p.status !== 'FAILED') return null
    // Held for 7 days after settlement; the server refuses earlier transfers too
    if (new Date(p.transferableFrom).getTime() > now)
      return (
        <span className="text-fg-muted text-sm">
          {t('payouts.heldUntil', { date: formatDateTime(p.transferableFrom) })}
        </span>
      )
    if (confirmId === p.id)
      return (
        <div className="flex flex-wrap justify-end gap-2">
          <Button size="sm" onClick={() => run(p, payouts.transfer)}>
            {t('payouts.confirm', { amount: formatVnd(p.amount) })}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setConfirmId(null)}>
            {t('payouts.cancel')}
          </Button>
        </div>
      )
    return (
      <Button size="sm" disabled={busy} onClick={() => setConfirmId(p.id)}>
        {p.status === 'FAILED' ? t('payouts.retry') : t('payouts.transfer')}
      </Button>
    )
  }

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
              <th className="text-left">{t('payouts.col.createdAt')}</th>
              <th className="text-left">{t('payouts.col.recipient')}</th>
              <th className="text-left">{t('payouts.col.account')}</th>
              <th className="text-right">{t('payouts.col.amount')}</th>
              <th className="text-left">{t('payouts.col.status')}</th>
              <th className="text-right">
                <span className="sr-only">{t('payouts.col.actions')}</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {payouts.isLoading && <SkeletonRows cols={6} />}
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
                      tone: TONES[p.status] ?? 'neutral',
                    }}
                  />
                  {stageLine(p)}
                  {p.completedAt && (
                    <p className="num text-fg-muted mt-1">
                      {formatDateTime(p.completedAt)}
                    </p>
                  )}
                  {p.lastError && (
                    <p className="text-danger mt-1">{p.lastError}</p>
                  )}
                  {p.history.length > 0 && (
                    <details className="mt-2">
                      <summary className="text-fg-muted cursor-pointer">
                        {t('payouts.history.title', { count: p.history.length })}
                      </summary>
                      <ol className="text-fg-muted mt-1 space-y-1">
                        {p.history.map((h, i) => (
                          <li key={i}>
                            <span className="num">{formatDateTime(h.at)}</span>
                            {' · '}
                            {statusLabel(h.status)}
                            {h.attemptNo > 0 &&
                              ` · ${t('payouts.history.attempt', { n: h.attemptNo })}`}
                            {h.accountLast4 && (
                              <span className="num"> · •••• {h.accountLast4}</span>
                            )}
                            {' · '}
                            {h.actorUserId
                              ? t('payouts.history.by', { id: h.actorUserId })
                              : t('payouts.history.system')}
                            {h.note && <span className="break-all"> · {h.note}</span>}
                          </li>
                        ))}
                      </ol>
                    </details>
                  )}
                  {p.attemptsExhausted && (
                    <p className="text-danger mt-1 font-semibold">
                      {t('payouts.attemptsExhausted', { count: p.attemptCount })}
                    </p>
                  )}
                </td>
                <td className="text-right">{actions(p)}</td>
              </tr>
            ))}
            {!payouts.isLoading && items.length === 0 && (
              <tr className="border-border-subtle border-t">
                <td
                  colSpan={6}
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
      {toast && <Toast message={toast} onDone={clearToast} />}
    </section>
  )
}
