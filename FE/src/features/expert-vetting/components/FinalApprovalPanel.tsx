import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { FinalApprovalDecision, QualificationDetail } from '../types'

interface FinalApprovalPanelProps {
  detail: QualificationDetail
  /** The signed-in admin passed Gate 2 for this qualification (BR-E33) */
  isGate2Reviewer: boolean
  submitting: boolean
  onDecide: (decision: FinalApprovalDecision, note: string) => void
}

/* Governance check by a System Admin: approve the Gate 2 result or return it for review */
export function FinalApprovalPanel({
  detail,
  isGate2Reviewer,
  submitting,
  onDecide,
}: FinalApprovalPanelProps) {
  const { t } = useTranslation('admin')
  const [note, setNote] = useState('')
  const [tried, setTried] = useState(false)
  const noteMissing = tried && !note.trim()

  if (!detail.canFinalApprove)
    return (
      <section className="paper p-5 md:p-6">
        <h2 className="text-h2">{t('finalApproval.panelTitle')}</h2>
        <p className="text-fg-muted mt-2 text-sm">
          {t('finalApproval.notPending')}
        </p>
      </section>
    )

  return (
    <section className="paper p-5 md:p-6">
      <h2 className="text-h2">{t('finalApproval.panelTitle')}</h2>
      <p className="text-fg-muted mt-1 text-sm">{t('finalApproval.intro')}</p>
      {isGate2Reviewer && (
        <p
          role="status"
          className="bg-warning-soft text-warning rounded-surface mt-3 p-3 text-sm"
        >
          {t('finalApproval.sameReviewer')}
        </p>
      )}
      <label className="mt-4 flex flex-col gap-2 text-sm font-semibold">
        {t('finalApproval.noteLabel')}
        <textarea
          rows={3}
          maxLength={2000}
          value={note}
          disabled={submitting || isGate2Reviewer}
          aria-invalid={noteMissing}
          onChange={(e) => setNote(e.target.value)}
          placeholder={t('finalApproval.notePlaceholder')}
          className="border-border-control rounded-control shadow-control bg-paper placeholder:text-fg-muted resize-y border px-3 py-2 text-base font-normal aria-[invalid=true]:border-danger"
        />
      </label>
      {noteMissing && (
        <p className="text-danger mt-1 text-sm">
          {t('competency.errors.FINAL_APPROVAL_NOTE_REQUIRED')}
        </p>
      )}
      <div className="mt-4 flex flex-wrap justify-end gap-2">
        <button
          type="button"
          disabled={submitting || isGate2Reviewer}
          onClick={() => {
            setTried(true)
            if (note.trim()) onDecide('RETURN_FOR_REVIEW', note)
          }}
          className="btn btn-press btn-secondary"
        >
          {t('finalApproval.return')}
        </button>
        <button
          type="button"
          disabled={submitting || isGate2Reviewer}
          onClick={() => onDecide('APPROVE', note)}
          className="btn btn-press btn-primary"
        >
          {t('finalApproval.approve')}
        </button>
      </div>
    </section>
  )
}
