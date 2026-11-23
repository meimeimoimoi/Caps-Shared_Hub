import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { Modal } from '@/components/ui/feedback/modal'
import { COMPETENCY_OUTCOME } from '../constants'
import { useCompetencyLabel } from '../hooks/useLabels'
import type { CompetencyAssessment, CompetencyOutcome } from '../types'

interface CompetencyDecisionDialogProps {
  expertName: string
  serviceName: string
  outcome: CompetencyOutcome
  assessments: CompetencyAssessment[]
  submitting: boolean
  onCancel: () => void
  onConfirm: (note: string) => void
}

/* Confirms the Gate 2 outcome derived from the per-competency results */
export function CompetencyDecisionDialog({
  expertName,
  serviceName,
  outcome,
  assessments,
  submitting,
  onCancel,
  onConfirm,
}: CompetencyDecisionDialogProps) {
  const [note, setNote] = useState('')
  const cfg = COMPETENCY_OUTCOME[outcome]
  const { t } = useTranslation(['admin', 'common'])
  const label = useCompetencyLabel()

  return (
    <Modal
      title={t('admin:competency.dialog.title', {
        name: expertName,
        service: serviceName,
      })}
      description={t(`admin:${cfg.notice}`)}
      onClose={onCancel}
      onSubmit={() => onConfirm(note)}
      footer={
        <>
          <button
            type="button"
            onClick={onCancel}
            className="btn btn-press btn-secondary"
          >
            {t('common:actions.cancel')}
          </button>
          <button
            type="submit"
            disabled={submitting}
            className={cn(
              'btn btn-press',
              outcome === 'FAIL' ? 'bg-danger text-paper' : 'btn-primary'
            )}
          >
            {t(`admin:${cfg.confirm}`)}
          </button>
        </>
      }
    >
      <ul className="bg-sunken rounded-surface divide-border-subtle mt-4 divide-y px-3 text-sm">
        {assessments.map((a) => (
          <li key={a.code} className="py-2">
            <div className="flex justify-between gap-4">
              <span className="text-fg-muted">
                {label.name(a.code)}
              </span>
              <span
                className={cn(
                  'shrink-0 font-semibold',
                  a.result === 'FAIL'
                    ? 'text-danger'
                    : a.result === 'NEED_MORE_INFORMATION'
                      ? 'text-warning'
                      : 'text-fg-strong'
                )}
              >
                {a.result && t(`admin:eligibility.results.${a.result}`)}
              </span>
            </div>
            <p className="text-fg mt-1 whitespace-pre-line">{a.note}</p>
          </li>
        ))}
      </ul>
      <label className="mt-5 flex flex-col gap-2 text-sm font-semibold">
        {t('admin:competency.dialog.noteLabel')}
        <textarea
          rows={3}
          maxLength={2000}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder={t('admin:competency.dialog.placeholder')}
          className="border-border-control rounded-control shadow-control bg-paper placeholder:text-fg-muted resize-y border px-3 py-2 text-base font-normal"
        />
      </label>
    </Modal>
  )
}
