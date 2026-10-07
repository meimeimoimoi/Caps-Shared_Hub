import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Modal } from '@/components/ui/feedback/modal'
import { DECISION_DIALOG } from '../constants'
import type { Criterion } from '../types'
import { ScoreSummary } from './ScoreSummary'
import { useTranslation } from 'react-i18next'

interface DecisionDialogProps {
  kind: keyof typeof DECISION_DIALOG
  applicantName: string
  criteria: Criterion[]
  scores: Record<string, number>
  onCancel: () => void
  onConfirm: (note: string) => void
}

/* Dialog xác nhận Duyệt / Từ chối */
export function DecisionDialog({
  kind,
  applicantName,
  criteria,
  scores,
  onCancel,
  onConfirm,
}: DecisionDialogProps) {
  const [note, setNote] = useState('')
  const cfg = DECISION_DIALOG[kind]
  const { t } = useTranslation(['admin', 'common'])

  return (
    <Modal
      title={`${t(cfg.title as any)} ${applicantName}?`}
      description={t(cfg.notice as any)}
      onClose={onCancel}
      // `required` trên textarea đã chặn submit khi trống
      onSubmit={() => onConfirm(note)}
      footer={
        <>
          <button
            type="button"
            onClick={onCancel}
            className="btn btn-press btn-secondary"
          >
            {t('common:actions.cancel' as any, 'Hủy') as string}
          </button>
          <button
            type="submit"
            className={cn(
              'btn btn-press',
              kind === 'reject' ? 'bg-danger text-paper' : 'btn-primary'
            )}
          >
            {t(cfg.confirm as any) as string}
          </button>
        </>
      }
    >
      {cfg.showScores && (
        <div className="mt-4">
          <ScoreSummary criteria={criteria} scores={scores} />
        </div>
      )}
      <label className="mt-5 flex flex-col gap-2 text-sm font-semibold">
        {t(cfg.noteLabel as any)}
        <textarea
          rows={3}
          required={cfg.required}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder={t(cfg.placeholder as any)}
          className="border-border-control rounded-control shadow-control bg-paper placeholder:text-fg-muted resize-y border px-3 py-2 text-base font-normal"
        />
      </label>
    </Modal>
  )
}

