import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { cn } from '@/lib/utils'
import { ApiError } from '@/lib/api-client'
import { Modal } from '@/components/ui/feedback/modal'
import { Toast } from '@/components/ui/feedback/toast'
import { AdminLayout } from '@/app/layouts/admin/AdminLayout'
import { useAdminNav } from '@/app/layouts/admin/useAdminNav'
import { useFormatters } from '@/hooks/useFormatters'
import { adminKeys } from '../../features/expert-vetting/api/queryKeys'
import {
  decidePricing,
  getPricingReviews,
  type PricingDecision,
  type PricingReviewItem,
  type PricingReviewStatus,
} from '../../features/expert-vetting/api/pricingReviewApi'
import { formatDate } from '../../features/expert-vetting/utils/applications'

const TABS: PricingReviewStatus[] = [
  'PENDING_APPROVAL',
  'RETURN_FOR_REVISION',
  'REJECTED',
]
const DECISION_ERRORS = [
  'PRICING_NOT_PENDING',
  'PRICING_NOTE_REQUIRED',
  'INVALID_PRICING_DECISION',
] as const
type DecisionError = (typeof DECISION_ERRORS)[number]
const isDecisionError = (code?: string): code is DecisionError =>
  (DECISION_ERRORS as readonly (string | undefined)[]).includes(code)

/** Price changes above the auto-approval threshold, decided by a System Admin (POL-MKT-02) */
export default function AdminPricingApprovalsPage() {
  const nav = useAdminNav()
  const { t } = useTranslation(['admin', 'common'])
  const format = useFormatters()
  const qc = useQueryClient()
  const [tab, setTab] = useState<PricingReviewStatus>('PENDING_APPROVAL')
  const [open, setOpen] = useState<{
    item: PricingReviewItem
    decision: PricingDecision
  } | null>(null)
  const [note, setNote] = useState('')
  const [toast, setToast] = useState<string | null>(null)
  const clearToast = useCallback(() => setToast(null), [])

  const key = [...adminKeys.all, 'pricing-reviews'] as const
  const query = useQuery({
    queryKey: key,
    queryFn: ({ signal }) => getPricingReviews(TABS, signal),
  })
  const decision = useMutation({
    mutationFn: (input: {
      id: string
      decision: PricingDecision
      note: string
    }) => decidePricing(input.id, input.decision, input.note),
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  })
  const items = query.data ?? []
  const rows = items.filter((x) => x.status === tab)
  const needsNote = open?.decision !== 'APPROVE'

  const confirm = () => {
    if (!open || (needsNote && !note.trim())) return
    decision
      .mutateAsync({ id: open.item.id, decision: open.decision, note })
      .then(() => {
        setToast(t(`admin:pricingReview.toast.${open.decision}`))
        setOpen(null)
        setNote('')
      })
      .catch((e: unknown) =>
        setToast(
          e instanceof ApiError && isDecisionError(e.code)
            ? t(`admin:pricingReview.errors.${e.code}`)
            : t('admin:pricingReview.errors.failed')
        )
      )
  }

  return (
    <AdminLayout
      {...nav}
      section="pricingReview"
      breadcrumb={t('admin:navigation.pricingReview')}
    >
      <h1 className="text-h1">{t('admin:pricingReview.title')}</h1>
      <p className="text-fg-muted mt-3">{t('admin:pricingReview.description')}</p>

      <div
        role="group"
        aria-label={t('admin:pendingExperts.filterAria')}
        className="mt-12 flex gap-7 overflow-x-auto"
      >
        {TABS.map((key) => (
          <button
            key={key}
            type="button"
            aria-pressed={tab === key}
            onClick={() => setTab(key)}
            className={cn(
              'border-b-2 pb-2 whitespace-nowrap',
              tab === key
                ? 'border-indicator text-fg-strong font-semibold'
                : 'text-fg-muted border-transparent'
            )}
          >
            {t(`admin:pricingReview.tabs.${key}`)}{' '}
            <span className="num">
              ({items.filter((x) => x.status === key).length})
            </span>
          </button>
        ))}
      </div>

      <section className="paper mt-4 overflow-x-auto">
        <table className="w-full min-w-[820px] text-sm">
          <thead className="bg-sunken text-fg-muted">
            <tr className="[&>th]:px-4 [&>th]:py-3 [&>th]:text-left [&>th]:font-semibold">
              <th>{t('admin:pricingReview.expert')}</th>
              <th>{t('admin:pricingReview.change')}</th>
              <th>{t('admin:pricingReview.effectiveFrom')}</th>
              <th>{t('admin:pricingReview.reason')}</th>
              <th>
                <span className="sr-only">{t('admin:applicationsTable.actions')}</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((x) => (
              <tr
                key={x.id}
                className="border-border-subtle border-t align-top [&>td]:px-4 [&>td]:py-3"
              >
                <td>
                  <div className="text-fg-strong font-semibold">
                    {x.displayName ?? x.expertUserId}
                  </div>
                  <div className="text-fg-muted">
                    {x.serviceCode} · v{x.sequence}
                  </div>
                </td>
                <td>
                  <div className="num">
                    {x.currentAmount != null
                      ? `${format.money(String(x.currentAmount))} → `
                      : ''}
                    <span className="text-fg-strong font-semibold">
                      {format.money(String(x.amount))}
                    </span>
                  </div>
                  {x.changePercent != null && (
                    <div className="text-warning">
                      {t('admin:pricingReview.percent', {
                        percent: x.changePercent,
                      })}
                    </div>
                  )}
                </td>
                <td className="num">{formatDate(x.effectiveFrom)}</td>
                <td className="max-w-xs whitespace-pre-line">
                  {x.reason}
                  {x.decisionNote && (
                    <p className="text-fg-muted mt-1">{x.decisionNote}</p>
                  )}
                </td>
                <td className="text-right whitespace-nowrap">
                  {x.status === 'PENDING_APPROVAL' && (
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        className="btn btn-press btn-secondary"
                        onClick={() =>
                          setOpen({ item: x, decision: 'RETURN_FOR_REVISION' })
                        }
                      >
                        {t('admin:pricingReview.return')}
                      </button>
                      <button
                        type="button"
                        className="btn btn-press btn-secondary"
                        onClick={() => setOpen({ item: x, decision: 'REJECT' })}
                      >
                        {t('admin:pricingReview.reject')}
                      </button>
                      <button
                        type="button"
                        className="btn btn-press btn-primary"
                        onClick={() => setOpen({ item: x, decision: 'APPROVE' })}
                      >
                        {t('admin:pricingReview.approve')}
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr className="border-border-subtle border-t">
                <td colSpan={5} className="text-fg-muted px-4 py-10 text-center">
                  {query.isLoading
                    ? t('common:loading')
                    : (query.error?.message ?? t('admin:pricingReview.empty'))}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      {open && (
        <Modal
          title={t(`admin:pricingReview.dialog.${open.decision}`, {
            name: open.item.displayName ?? open.item.expertUserId,
          })}
          onClose={() => setOpen(null)}
          onSubmit={confirm}
          footer={
            <>
              <button
                type="button"
                onClick={() => setOpen(null)}
                className="btn btn-press btn-secondary"
              >
                {t('common:actions.cancel')}
              </button>
              <button
                type="submit"
                disabled={decision.isPending || (needsNote && !note.trim())}
                className={cn(
                  'btn btn-press',
                  open.decision === 'REJECT' ? 'bg-danger text-paper' : 'btn-primary'
                )}
              >
                {t(`admin:pricingReview.${open.decision === 'APPROVE' ? 'approve' : open.decision === 'REJECT' ? 'reject' : 'return'}`)}
              </button>
            </>
          }
        >
          <label className="mt-4 flex flex-col gap-2 text-sm font-semibold">
            {needsNote
              ? t('admin:pricingReview.noteRequired')
              : t('admin:pricingReview.noteOptional')}
            <textarea
              rows={3}
              maxLength={2000}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="border-border-control rounded-control shadow-control bg-paper resize-y border px-3 py-2 text-base font-normal"
            />
          </label>
        </Modal>
      )}
      {toast && <Toast message={toast} onDone={clearToast} />}
    </AdminLayout>
  )
}
