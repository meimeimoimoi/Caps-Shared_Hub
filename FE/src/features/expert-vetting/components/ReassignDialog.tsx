import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Modal } from '@/components/ui/feedback/modal'
import { HelpTip } from '@/components/ui/feedback/help-tip'
import { getKnownReviewers } from '../api/assignmentApi'
import { adminKeys } from '../api/queryKeys'

const MAX_REASON = 1000

/** System Admin hands a review to another reviewer; a reason is required and kept in the claim history */
export function ReassignDialog({
  expertName,
  currentHolderId,
  submitting,
  onCancel,
  onConfirm,
}: {
  expertName: string
  currentHolderId: string | null
  submitting: boolean
  onCancel: () => void
  onConfirm: (reviewerUserId: string, reason: string) => void
}) {
  const { t } = useTranslation(['admin', 'common'])
  const reviewers = useQuery({
    queryKey: adminKeys.reviewers(),
    queryFn: ({ signal }) => getKnownReviewers(signal),
  })
  const [reviewerId, setReviewerId] = useState('')
  const [reason, setReason] = useState('')
  const options = (reviewers.data ?? []).filter((r) => r.userId !== currentHolderId)
  const ready = !!reviewerId && !!reason.trim() && !submitting

  return (
    <Modal
      title={t('admin:assignments.dialog.title', { name: expertName })}
      onClose={onCancel}
      preventClose={submitting}
      onSubmit={() => ready && onConfirm(reviewerId, reason.trim())}
      footer={
        <>
          <button type="button" onClick={onCancel} disabled={submitting} className="btn btn-press btn-secondary">
            {t('common:actions.cancel')}
          </button>
          <button type="submit" disabled={!ready} className="btn btn-press btn-primary">
            {t('admin:assignments.dialog.confirm')}
          </button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-1.5">
            <label htmlFor="reassign-reviewer" className="text-sm font-semibold">
              {t('admin:assignments.dialog.reviewer')}
            </label>
            <HelpTip label={t('admin:assignments.dialog.reviewer')}>{t('admin:assignments.dialog.reviewerHelp')}</HelpTip>
          </div>
          <select
            id="reassign-reviewer"
            value={reviewerId}
            onChange={(e) => setReviewerId(e.target.value)}
            className="border-border-control rounded-control shadow-control bg-paper border px-3 py-2"
          >
            <option value="">{reviewers.isLoading ? t('common:loading') : t('admin:assignments.dialog.choose')}</option>
            {options.map((r) => (
              <option key={r.userId} value={r.userId}>
                {r.email ?? r.userId.slice(0, 8)}
              </option>
            ))}
          </select>
        </div>
        <label className="flex flex-col gap-2 text-sm font-semibold">
          {t('admin:assignments.dialog.reason')}
          <textarea
            rows={3}
            maxLength={MAX_REASON}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={t('admin:assignments.dialog.reasonPlaceholder')}
            className="border-border-control rounded-control shadow-control bg-paper resize-y border px-3 py-2 text-base font-normal"
          />
        </label>
      </div>
    </Modal>
  )
}
