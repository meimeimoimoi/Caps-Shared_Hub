import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Check, CircleAlert, CircleSlash, Plus, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { APPLICATION_STATUS } from '@/lib/constants'
import { Modal } from '@/components/ui/feedback/modal'
import { ELIGIBILITY_OUTCOME } from '../constants'
import { useEligibilityLabel } from '../hooks/useLabels'
import type { EligibilityAssessment, EligibilityOutcome } from '../types'

interface DecisionDialogProps {
  applicantName: string
  outcome: EligibilityOutcome
  assessments: EligibilityAssessment[]
  submitting: boolean
  onCancel: () => void
  onConfirm: (note: string) => void
}

const tone = {
  success: { banner: 'border-success/40 bg-success/10', text: 'text-success', Icon: Check, button: 'bg-success text-white hover:bg-success/90' },
  warning: { banner: 'border-warning/40 bg-warning/10', text: 'text-warning', Icon: CircleAlert, button: 'bg-warning text-black hover:bg-warning/90' },
  danger: { banner: 'border-danger/40 bg-danger/10', text: 'text-danger', Icon: X, button: 'bg-danger text-white hover:bg-danger/90' },
} as const

const resultTone = {
  FAIL: { text: 'text-danger', Icon: X },
  NEED_MORE_INFORMATION: { text: 'text-warning', Icon: CircleAlert },
} as const

/* Confirms the Gate 1 outcome derived from the per-requirement results */
export function DecisionDialog({
  applicantName,
  outcome,
  assessments,
  submitting,
  onCancel,
  onConfirm,
}: DecisionDialogProps) {
  const [note, setNote] = useState('')
  const [showNote, setShowNote] = useState(false)
  const cfg = ELIGIBILITY_OUTCOME[outcome]
  const style = tone[cfg.tone]
  const { t } = useTranslation(['admin', 'common'])
  const label = useEligibilityLabel()
  // Sent to the applicant with their notes: only results they must act on. NOT_APPLICABLE stays internal
  // (the server leaves it out of the email and the applicant's page), so it is listed apart
  const flagged = assessments.filter(
    (a) => a.result === 'FAIL' || a.result === 'NEED_MORE_INFORMATION'
  )
  const notApplicable = assessments.filter((a) => a.result === 'NOT_APPLICABLE')
  const passed = assessments.filter((a) => a.result === 'PASS')

  return (
    <Modal
      title={t('admin:eligibility.dialog.title', { name: applicantName })}
      size="lg"
      onClose={onCancel}
      onSubmit={() => onConfirm(note)}
      footer={
        <>
          <button type="button" onClick={onCancel} className="btn btn-press btn-secondary">
            {t('common:actions.cancel')}
          </button>
          <button
            type="submit"
            disabled={submitting}
            className={cn('inline-flex min-h-11 items-center rounded-md px-4 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60', style.button)}
          >
            {t(`admin:${cfg.confirm}`)}
          </button>
        </>
      }
    >
      <div className={cn('flex gap-3 rounded-lg border p-3.5', style.banner)}>
        <style.Icon size={18} aria-hidden="true" className={cn('mt-0.5 shrink-0', style.text)} />
        <div className="min-w-0">
          <p className={cn('text-sm font-semibold', style.text)}>{APPLICATION_STATUS[outcome].label}</p>
          <p className="text-text mt-0.5 text-sm leading-6">{t(`admin:${cfg.notice}`)}</p>
        </div>
      </div>

      {flagged.length > 0 && (
        <p className="text-text-muted mt-4 mb-1.5 text-xs font-medium">
          {t('admin:eligibility.dialog.sent', { count: flagged.length })}
        </p>
      )}
      {flagged.length > 0 && (
        <ul className="space-y-2">
          {flagged.map((a) => {
            const result = a.result as keyof typeof resultTone
            const { text, Icon } = resultTone[result]
            return (
              <li key={a.code} className="border-border rounded-lg border p-3 text-sm">
                <div className="flex items-start justify-between gap-3">
                  <span className="text-text-strong font-medium">{label(a.code)}</span>
                  <span className={cn('inline-flex shrink-0 items-center gap-1 text-xs font-semibold', text)}>
                    <Icon size={13} aria-hidden="true" />
                    {t(`admin:eligibility.results.${result}`)}
                  </span>
                </div>
                {a.note.trim() && (
                  <p className="bg-surface-muted text-text mt-2 rounded-md px-3 py-2 leading-6 whitespace-pre-line">{a.note}</p>
                )}
              </li>
            )
          })}
        </ul>
      )}

      {notApplicable.length > 0 && (
        <div className="mt-4">
          <p className="text-text-muted mb-1.5 text-xs font-medium">
            {t('admin:eligibility.dialog.notApplicable', { count: notApplicable.length })}
          </p>
          <ul className="space-y-1.5">
            {notApplicable.map((a) => (
              <li key={a.code} className="bg-surface-muted text-text rounded-md px-3 py-2 text-xs leading-5">
                <span className="text-text-strong inline-flex items-center gap-1 font-medium">
                  <CircleSlash size={12} aria-hidden="true" className="text-text-muted" />
                  {label(a.code)}
                </span>
                {a.note.trim() && <span className="text-text-muted whitespace-pre-line"> · {a.note}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}

      {passed.length > 0 && (
        <div className="mt-4">
          <p className="text-text-muted mb-1.5 text-xs font-medium">
            {t('admin:eligibility.dialog.passed', { count: passed.length })}
          </p>
          <ul className="flex flex-wrap gap-1.5">
            {passed.map((a) => (
              <li key={a.code} className="bg-success/10 text-success inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium">
                <Check size={12} aria-hidden="true" />
                {label(a.code)}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Each criterion already carries its own note, so the overall note stays folded until wanted */}
      {!showNote ? (
        <button type="button" onClick={() => setShowNote(true)} className="text-text-muted hover:text-text-strong mt-5 inline-flex items-center gap-1.5 text-sm font-medium">
          <Plus size={14} aria-hidden="true" />
          {t('admin:eligibility.dialog.addNote')}
        </button>
      ) : (
      <label className="text-text-strong mt-5 flex flex-col gap-1.5 text-sm font-medium">
        {t('admin:eligibility.dialog.noteLabel')}
        <textarea
          autoFocus
          rows={3}
          maxLength={2000}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder={t('admin:eligibility.dialog.placeholder')}
          className="border-border-control bg-surface text-text placeholder:text-text-muted focus-visible:ring-[var(--ui-border-strong)] resize-y rounded-md border px-3 py-2 text-sm leading-6 font-normal focus-visible:ring-2 focus-visible:outline-none"
        />
      </label>
      )}
    </Modal>
  )
}
