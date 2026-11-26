import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { formatDateTime } from '@/lib/utils'
import { Button } from '@/components/ui/actions/button'
import { StatusBadge } from '@/components/ui/display/status-badge'
import { SkeletonRows } from '@/components/ui/display/skeleton-rows'
import { HelpTip } from '@/components/ui/feedback/help-tip'
import { Toast } from '@/components/ui/feedback/toast'
import {
  errorToast,
  type ToastContent,
} from '@/components/ui/feedback/toast-content'
import { Pagination } from '@/components/ui/navigation/pagination'
import {
  BANK_REVIEW_PAGE_SIZE,
  type BankReviewStatus,
  type ReviewBankAccount,
} from '../api/bankReviewApi'
import { useBankReview } from '../hooks/useBankReview'

const headCls =
  'bg-sunken text-fg-muted [&>th]:px-4 [&>th]:py-3 [&>th]:font-semibold'
const rowCls = 'border-border-subtle border-t align-top [&>td]:px-4 [&>td]:py-3'
const inputCls =
  'border-border-control rounded-control shadow-control bg-paper h-control border px-3 text-sm font-normal'

const STATUSES: BankReviewStatus[] = ['UNVERIFIED', 'VERIFIED', 'REJECTED']
const TONES = {
  UNVERIFIED: 'warning',
  VERIFIED: 'success',
  REJECTED: 'danger',
} as const
const MAX_REASON = 500

/* Staff check each expert's payout account before any money goes to it */
export function BankAccountReviewTable() {
  const { t } = useTranslation(['admin', 'common'])
  const review = useBankReview()
  const items = review.data?.items ?? []
  const total = review.data?.total ?? 0
  const [rejecting, setRejecting] = useState<string | null>(null)
  const [reason, setReason] = useState('')
  const [busyId, setBusyId] = useState<string | null>(null)
  const [toast, setToast] = useState<ToastContent | null>(null)
  const clearToast = useCallback(() => setToast(null), [])

  const run = (a: ReviewBankAccount, call: Promise<unknown>, done: string) => {
    setBusyId(a.id)
    call
      .then(() => {
        setRejecting(null)
        setReason('')
        setToast(done)
      })
      .catch((e: Error) =>
        setToast(errorToast(e.message || t('common:states.actionFailed')))
      )
      .finally(() => setBusyId(null))
  }

  const actions = (a: ReviewBankAccount) => {
    if (a.status !== 'UNVERIFIED') return null
    const busy = busyId === a.id
    if (rejecting === a.id)
      return (
        <form
          className="flex flex-col items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            run(a, review.reject(a.id, reason.trim()), t('bankReview.rejected'))
          }}
        >
          <label className="sr-only" htmlFor={`reason-${a.id}`}>
            {t('bankReview.reason')}
          </label>
          <input
            id={`reason-${a.id}`}
            className={`${inputCls} w-64`}
            value={reason}
            maxLength={MAX_REASON}
            placeholder={t('bankReview.reason')}
            onChange={(e) => setReason(e.target.value)}
            autoFocus
          />
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="destructive"
              type="submit"
              disabled={busy || !reason.trim()}
            >
              {t('bankReview.confirmReject')}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              type="button"
              onClick={() => setRejecting(null)}
            >
              {t('bankReview.cancel')}
            </Button>
          </div>
        </form>
      )
    return (
      <div className="flex flex-wrap justify-end gap-2">
        <Button
          size="sm"
          disabled={busy}
          onClick={() => run(a, review.verify(a.id), t('bankReview.verified'))}
        >
          {t('bankReview.verify')}
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={busy}
          onClick={() => {
            setRejecting(a.id)
            setReason('')
          }}
        >
          {t('bankReview.reject')}
        </Button>
      </div>
    )
  }

  return (
    <section className="mt-6" aria-labelledby="bank-review-title">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex items-center gap-2">
          <h2 id="bank-review-title" className="text-h2">
            {t('bankReview.title')}
          </h2>
          <HelpTip label={t('bankReview.title')}>
            {t('bankReview.help')}
          </HelpTip>
        </div>
        <label className="flex flex-col gap-1.5 text-sm font-semibold">
          {t('bankReview.filter')}
          <select
            value={review.status ?? ''}
            onChange={(e) => review.setStatus(e.target.value || null)}
            className={inputCls}
          >
            <option value="">{t('bankReview.all')}</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {t(`bankReview.status.${s}`)}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="paper mt-3 overflow-x-auto">
        <table className="w-full min-w-200 text-sm">
          <thead>
            <tr className={headCls}>
              <th className="text-left">{t('bankReview.col.createdAt')}</th>
              <th className="text-left">{t('bankReview.col.expert')}</th>
              <th className="text-left">{t('bankReview.col.account')}</th>
              <th className="text-left">{t('bankReview.col.holder')}</th>
              <th className="text-left">{t('bankReview.col.status')}</th>
              <th className="text-right">
                <span className="sr-only">{t('bankReview.col.actions')}</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {review.isLoading && <SkeletonRows cols={6} />}
            {items.map((a) => {
              const expert = review.names?.get(a.userId)
              return (
                <tr key={a.id} className={rowCls}>
                  <td className="num whitespace-nowrap">
                    {formatDateTime(a.createdAt)}
                  </td>
                  <td>
                    {expert?.name ? (
                      <>
                        <p className="text-fg-strong">{expert.name}</p>
                        <p className="text-fg-muted">{expert.email}</p>
                      </>
                    ) : (
                      <span className="num text-fg-muted break-all">
                        {a.userId}
                      </span>
                    )}
                  </td>
                  <td>
                    <p className="text-fg-strong">{a.bankName}</p>
                    <p className="num">{a.accountNumber}</p>
                  </td>
                  <td>{a.accountHolderName}</td>
                  <td>
                    <StatusBadge
                      status={{
                        label: t(`bankReview.status.${a.status}`),
                        tone: TONES[a.status] ?? 'neutral',
                      }}
                    />
                    {a.rejectionReason && (
                      <p className="text-danger mt-1">{a.rejectionReason}</p>
                    )}
                  </td>
                  <td className="text-right">{actions(a)}</td>
                </tr>
              )
            })}
            {!review.isLoading && items.length === 0 && (
              <tr className="border-border-subtle border-t">
                <td
                  colSpan={6}
                  className="text-fg-muted px-4 py-10 text-center"
                >
                  {review.error?.message ?? t('bankReview.empty')}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {total > BANK_REVIEW_PAGE_SIZE && (
        <div className="mt-3">
          <Pagination
            page={review.page}
            pageSize={BANK_REVIEW_PAGE_SIZE}
            total={total}
            onPageChange={review.setPage}
            label={t('bankReview.title')}
          />
        </div>
      )}
      {toast && <Toast message={toast} onDone={clearToast} />}
    </section>
  )
}
