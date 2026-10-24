import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { HelpTip } from '@/components/ui/feedback/help-tip'
import { formatDate } from '../utils/applications'
import type {
  FinalApprovalDecision,
  QualificationDetail,
  ServiceAccessAction,
} from '../types'

interface FinalApprovalPanelProps {
  detail: QualificationDetail
  /** The signed-in admin passed Gate 2 for this qualification (BR-E33) */
  isGate2Reviewer: boolean
  submitting: boolean
  onDecide: (decision: FinalApprovalDecision, note: string) => void
  onAccess: (action: ServiceAccessAction, note: string) => void
}

/* System Admin actions: final approval of the Gate 2 result, then suspending or reinstating the service */
export function FinalApprovalPanel({
  detail,
  isGate2Reviewer,
  submitting,
  onDecide,
  onAccess,
}: FinalApprovalPanelProps) {
  const { t } = useTranslation('admin')
  const [note, setNote] = useState('')
  const [tried, setTried] = useState(false)
  const [now] = useState(() => Date.now())
  const noteMissing = tried && !note.trim()
  const approval = detail.canFinalApprove
  const access = detail.canSuspend || detail.canReinstate
  const locked = submitting || (approval && isGate2Reviewer)
  const due = approval ? detail.finalApprovalDueAt : null
  const overdue = !!due && new Date(due).getTime() < now

  if (!approval && !access)
    return (
      <section className="paper p-5 md:p-6">
        <h2 className="text-h2">{t('finalApproval.panelTitle')}</h2>
        <p className="text-fg-muted mt-2 text-sm">
          {t('finalApproval.notPending')}
        </p>
      </section>
    )

  // Actions that need a reason check the note first
  const withNote = (run: () => void) => {
    setTried(true)
    if (note.trim()) run()
  }

  return (
    <section className="paper p-5 md:p-6">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-h2">
          {approval
            ? t('finalApproval.panelTitle')
            : t('finalApproval.accessTitle')}
        </h2>
        <HelpTip label={t('finalApproval.helpLabel')}>
          {approval
            ? t('finalApproval.intro')
            : detail.canSuspend
              ? t('finalApproval.suspendIntro')
              : t('finalApproval.reinstateIntro')}
        </HelpTip>
        {due && (
          <span
            aria-label={t('finalApproval.dueLabel')}
            className={`rounded-control ml-auto px-2 py-0.5 text-sm font-semibold ${overdue ? 'bg-danger/10 text-danger' : 'bg-sunken text-fg-strong'}`}
          >
            {overdue ? `${t('finalApproval.overdue')} · ` : ''}
            {t('finalApproval.dueOn', { date: formatDate(due) })}
          </span>
        )}
      </div>
      {approval && isGate2Reviewer && (
        <p
          role="status"
          className="bg-warning-soft text-warning rounded-surface mt-3 p-3 text-sm"
        >
          {t('finalApproval.sameReviewer')}
        </p>
      )}
      <label className="mt-4 flex flex-col gap-2 text-sm font-semibold">
        {approval
          ? t('finalApproval.noteLabel')
          : detail.canSuspend
            ? t('finalApproval.suspendNoteLabel')
            : t('finalApproval.reinstateNoteLabel')}
        <textarea
          rows={3}
          maxLength={2000}
          value={note}
          disabled={locked}
          aria-invalid={noteMissing}
          onChange={(e) => setNote(e.target.value)}
          placeholder={
            approval ? t('finalApproval.notePlaceholder') : undefined
          }
          className="border-border-control rounded-control shadow-control bg-paper placeholder:text-fg-muted aria-[invalid=true]:border-danger resize-y border px-3 py-2 text-base font-normal"
        />
      </label>
      {noteMissing && (
        <p className="text-danger mt-1 text-sm">
          {approval
            ? t('competency.errors.FINAL_APPROVAL_NOTE_REQUIRED')
            : t('competency.errors.SUSPENSION_NOTE_REQUIRED')}
        </p>
      )}
      <div className="mt-4 flex flex-wrap justify-end gap-2">
        {approval && (
          <>
            <button
              type="button"
              disabled={locked}
              onClick={() =>
                withNote(() => onDecide('RETURN_FOR_REVIEW', note))
              }
              className="btn btn-press btn-secondary"
            >
              {t('finalApproval.return')}
            </button>
            <button
              type="button"
              disabled={locked}
              onClick={() => onDecide('APPROVE', note)}
              className="btn btn-press btn-primary"
            >
              {t('finalApproval.approve')}
            </button>
          </>
        )}
        {detail.canSuspend && (
          <button
            type="button"
            disabled={locked}
            onClick={() => withNote(() => onAccess('SUSPEND', note))}
            className="btn btn-press bg-danger text-paper"
          >
            {t('finalApproval.suspend')}
          </button>
        )}
        {detail.canReinstate && (
          <button
            type="button"
            disabled={locked}
            onClick={() => onAccess('REINSTATE', note)}
            className="btn btn-press btn-primary"
          >
            {t('finalApproval.reinstate')}
          </button>
        )}
      </div>
    </section>
  )
}
