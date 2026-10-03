import { useEffect, useRef, useState, type FormEvent } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { DECISION_DIALOG } from '../constants'
import type { Criterion, ReviewDecision } from '../types'
import { ScoreSummary } from './ScoreSummary'

interface DecisionDialogProps {
  kind: ReviewDecision
  applicantName: string
  criteria: Criterion[]
  scores: Record<string, number>
  onCancel: () => void
  onConfirm: (note: string) => void
}

/* Native <dialog>: trình duyệt lo focus trap, phím Esc và backdrop.
 * Mount = mở; unmount = đóng. */
export function DecisionDialog({
  kind,
  applicantName,
  criteria,
  scores,
  onCancel,
  onConfirm,
}: DecisionDialogProps) {
  const ref = useRef<HTMLDialogElement>(null)
  const [note, setNote] = useState('')
  const cfg = DECISION_DIALOG[kind]

  useEffect(() => {
    ref.current?.showModal()
  }, [])

  const submit = (e: FormEvent) => {
    e.preventDefault() // `required` trên textarea đã chặn submit khi trống
    onConfirm(note)
  }

  return (
    <dialog
      ref={ref}
      onClose={onCancel}
      aria-labelledby="decision-title"
      className="bg-paper border-hairline rounded-overlay shadow-overlay text-fg backdrop:bg-ink/40 m-auto w-[calc(100%-32px)] max-w-lg border p-0"
    >
      <form onSubmit={submit}>
        <div className="p-5 md:p-6">
          <div className="flex items-start justify-between gap-4">
            <h2 id="decision-title" className="text-h2">
              {cfg.title} {applicantName}?
            </h2>
            <button
              type="button"
              onClick={onCancel}
              aria-label="Đóng"
              className="btn btn-ghost -mt-1 -mr-2 px-2"
            >
              <X size={18} aria-hidden="true" />
            </button>
          </div>
          <p className="mt-3">{cfg.notice}</p>
          {cfg.showScores && (
            <div className="mt-4">
              <ScoreSummary criteria={criteria} scores={scores} />
            </div>
          )}
          <label className="mt-5 flex flex-col gap-2 text-sm font-semibold">
            {cfg.noteLabel}
            <textarea
              rows={3}
              required={cfg.required}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={cfg.placeholder}
              className="border-border-control rounded-control shadow-control bg-paper placeholder:text-fg-muted resize-y border px-3 py-2 text-base font-normal"
            />
          </label>
        </div>
        <div className="border-border flex justify-end gap-2 border-t px-5 py-4 md:px-6">
          <button
            type="button"
            onClick={onCancel}
            className="btn btn-press btn-secondary"
          >
            Hủy
          </button>
          <button
            type="submit"
            className={cn(
              'btn btn-press',
              kind === 'reject' ? 'bg-danger text-paper' : 'btn-primary'
            )}
          >
            {cfg.confirm}
          </button>
        </div>
      </form>
    </dialog>
  )
}
