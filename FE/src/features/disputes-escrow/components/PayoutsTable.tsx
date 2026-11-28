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
  if (p.holdReason) return null
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
  // The payout whose hold or release form is open, with what staff typed
  const [holdId, setHoldId] = useState<string | null>(null)
  const [holdText, setHoldText] = useState('')
  const [holdDays, setHoldDays] = useState(7)
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

  // What needs attention today, the same counts as the daily email (advisor 2026-11-28)
  const banner = () => {
    const s = payouts.summary
    if (!s) return null
    const short = s.balance != null && s.balance < s.summary.amountToSend
    const parts = [
      s.summary.overdue > 0 &&
        t('payouts.banner.overdue', {
          count: s.summary.overdue,
          amount: formatVnd(s.summary.overdueAmount),
        }),
      s.summary.dueSoon > 0 &&
        t('payouts.banner.dueSoon', { count: s.summary.dueSoon }),
      s.summary.ready > 0 &&
        t('payouts.banner.ready', { count: s.summary.ready }),
      s.summary.heldPastReview > 0 &&
        t('payouts.banner.heldPastReview', {
          count: s.summary.heldPastReview,
        }),
      s.summary.waitingForAccount > 0 &&
        t('payouts.banner.waiting', { count: s.summary.waitingForAccount }),
    ].filter(Boolean)
    return (
      <div
        role="status"
        className={`paper mt-3 px-4 py-3 text-sm ${parts.length > 0 || short ? 'border-warning' : ''}`}
      >
        <p className="text-fg-strong font-semibold">
          {parts.length > 0 ? parts.join(' · ') : t('payouts.banner.clear')}
        </p>
        <p className={short ? 'text-danger mt-1' : 'text-fg-muted mt-1'}>
          {s.balance == null
            ? t('payouts.banner.balanceUnknown')
            : t(
                short
                  ? 'payouts.banner.balanceShort'
                  : 'payouts.banner.balance',
                {
                  balance: formatVnd(s.balance),
                  needed: formatVnd(s.summary.amountToSend),
                }
              )}
        </p>
      </div>
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

  const submitHold = (p: Payout) => {
    setHoldId(null)
    setBusyId(p.id)
    const call = p.holdReason
      ? payouts.release(p.id, holdText)
      : payouts.hold(p.id, holdText, holdDays)
    call
      .then(() =>
        setToast(t(p.holdReason ? 'payouts.hold.released' : 'payouts.hold.held'))
      )
      .catch((e: Error) =>
        setToast(errorToast(e.message || t('common:states.actionFailed')))
      )
      .finally(() => setBusyId(null))
  }

  // Advisor 2026-11-28: a hold needs a reason and a review date; lifting it keeps a note
  const holdForm = (p: Payout) => (
    <div className="flex w-72 flex-col gap-2 text-left">
      <textarea
        value={holdText}
        onChange={(e) => setHoldText(e.target.value)}
        maxLength={1000}
        rows={3}
        placeholder={t(
          p.holdReason ? 'payouts.hold.notePlaceholder' : 'payouts.hold.reasonPlaceholder'
        )}
        aria-label={t(p.holdReason ? 'payouts.hold.note' : 'payouts.hold.reason')}
        className={`${inputCls} h-auto py-2`}
      />
      {!p.holdReason && (
        <label className="flex items-center gap-2 text-sm">
          {t('payouts.hold.reviewDays')}
          <input
            type="number"
            min={1}
            max={30}
            value={holdDays}
            onChange={(e) => setHoldDays(Number(e.target.value) || 7)}
            className={`${inputCls} w-20`}
          />
        </label>
      )}
      <div className="flex justify-end gap-2">
        <Button
          size="sm"
          disabled={!p.holdReason && holdText.trim().length < 10}
          onClick={() => submitHold(p)}
        >
          {t(p.holdReason ? 'payouts.hold.release' : 'payouts.hold.submit')}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setHoldId(null)}>
          {t('payouts.cancel')}
        </Button>
      </div>
    </div>
  )

  const openHold = (p: Payout) => {
    setConfirmId(null)
    setHoldText('')
    setHoldDays(7)
    setHoldId(p.id)
  }

  const actions = (p: Payout) => {
    const busy = busyId === p.id
    if (holdId === p.id) return holdForm(p)
    if (p.holdReason)
      return (
        <Button size="sm" variant="outline" disabled={busy} onClick={() => openHold(p)}>
          {t('payouts.hold.release')}
        </Button>
      )
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
        <div className="flex flex-col items-end gap-2">
          <span className="text-fg-muted text-sm">
            {t('payouts.heldUntil', { date: formatDateTime(p.transferableFrom) })}
          </span>
          <Button size="sm" variant="outline" disabled={busy} onClick={() => openHold(p)}>
            {t('payouts.hold.open')}
          </Button>
        </div>
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
      <div className="flex flex-wrap justify-end gap-2">
        <Button size="sm" disabled={busy} onClick={() => setConfirmId(p.id)}>
          {p.status === 'FAILED' ? t('payouts.retry') : t('payouts.transfer')}
        </Button>
        <Button size="sm" variant="outline" disabled={busy} onClick={() => openHold(p)}>
          {t('payouts.hold.open')}
        </Button>
      </div>
    )
  }

  return (
    <section className="mt-6" aria-labelledby="payouts-title">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h2 id="payouts-title" className="text-h2">
          {t('payouts.title')}
        </h2>
      </div>
      {banner()}
      <div className="mt-3 flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1.5 text-sm font-semibold">
          {t('payouts.filter')}
          <select
            value={payouts.filters.status ?? ''}
            onChange={(e) =>
              payouts.setFilters({ status: e.target.value || null })
            }
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
        <label className="flex flex-col gap-1.5 text-sm font-semibold">
          {t('payouts.filters.expert')}
          <select
            value={payouts.filters.recipientUserId ?? ''}
            onChange={(e) =>
              payouts.setFilters({
                recipientUserId: e.target.value || undefined,
              })
            }
            className={inputCls}
          >
            <option value="">{t('payouts.all')}</option>
            {[...(payouts.names ?? new Map()).entries()].map(([id, e]) => (
              <option key={id} value={id}>
                {e.name ?? e.email ?? id}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-semibold">
          {t('payouts.filters.from')}
          <input
            type="date"
            value={payouts.filters.fromDay ?? ''}
            onChange={(e) =>
              payouts.setFilters({ fromDay: e.target.value || undefined })
            }
            className={inputCls}
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-semibold">
          {t('payouts.filters.to')}
          <input
            type="date"
            value={payouts.filters.toDay ?? ''}
            onChange={(e) =>
              payouts.setFilters({ toDay: e.target.value || undefined })
            }
            className={inputCls}
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-semibold">
          {t('payouts.filters.minAmount')}
          <input
            type="number"
            min={0}
            step={10000}
            value={payouts.filters.minAmount ?? ''}
            onChange={(e) =>
              payouts.setFilters({
                minAmount: e.target.value ? Number(e.target.value) : undefined,
              })
            }
            className={`${inputCls} w-36`}
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-semibold">
          {t('payouts.filters.maxAmount')}
          <input
            type="number"
            min={0}
            step={10000}
            value={payouts.filters.maxAmount ?? ''}
            onChange={(e) =>
              payouts.setFilters({
                maxAmount: e.target.value ? Number(e.target.value) : undefined,
              })
            }
            className={`${inputCls} w-36`}
          />
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
                <td className="break-all">
                  {payouts.names?.get(p.recipientUserId)?.name ?? (
                    <span className="num text-fg-muted">
                      {p.recipientUserId}
                    </span>
                  )}
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
                  {p.holdReason && p.holdReviewBy && (
                    <p className="text-warning mt-1 font-semibold">
                      {t('payouts.hold.label', {
                        date: formatDateTime(p.holdReviewBy),
                        reason: p.holdReason,
                      })}
                    </p>
                  )}
                  {p.transferFee != null && (
                    <p className="text-fg-muted mt-1">
                      {t('payouts.fee', { fee: formatVnd(p.transferFee) })}
                    </p>
                  )}
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
                        {t('payouts.history.title', {
                          count: p.history.length,
                        })}
                      </summary>
                      <ol className="text-fg-muted mt-1 space-y-1">
                        {p.history.map((h, i) => (
                          <li key={i}>
                            <span className="num">{formatDateTime(h.at)}</span>
                            {' · '}
                            {h.status === 'ON_HOLD'
                              ? t('payouts.hold.historyHeld')
                              : h.status === 'RELEASED'
                                ? t('payouts.hold.historyReleased')
                                : statusLabel(h.status)}
                            {h.attemptNo > 0 &&
                              ` · ${t('payouts.history.attempt', { n: h.attemptNo })}`}
                            {h.accountLast4 && (
                              <span className="num">
                                {' '}
                                · •••• {h.accountLast4}
                              </span>
                            )}
                            {' · '}
                            {h.actorUserId
                              ? t('payouts.history.by', { id: h.actorUserId })
                              : t('payouts.history.system')}
                            {h.note && (
                              <span className="break-all"> · {h.note}</span>
                            )}
                          </li>
                        ))}
                      </ol>
                    </details>
                  )}
                  {p.attemptsExhausted && (
                    <p className="text-danger mt-1 font-semibold">
                      {t('payouts.attemptsExhausted', {
                        count: p.attemptCount,
                      })}
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
