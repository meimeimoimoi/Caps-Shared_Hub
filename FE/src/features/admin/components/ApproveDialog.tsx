import { useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { APPROVE_NOTICE } from '../constants'
import type { Criterion } from '../types'
import { ScoreSummary } from './ScoreSummary'

interface ApproveDialogProps {
  open: boolean
  applicantName: string
  criteria: Criterion[]
  scores: Record<string, number>
  onCancel: () => void
  onConfirm: (note: string) => void
}

/* Native <dialog>: trình duyệt lo focus trap, phím Esc và backdrop */
export function ApproveDialog({
  open,
  applicantName,
  criteria,
  scores,
  onCancel,
  onConfirm,
}: ApproveDialogProps) {
  const ref = useRef<HTMLDialogElement>(null)
  const [note, setNote] = useState('')

  useEffect(() => {
    const d = ref.current
    if (open && !d?.open) d?.showModal()
    if (!open && d?.open) d.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      onClose={onCancel}
      aria-labelledby="approve-title"
      className="bg-paper border-hairline rounded-overlay shadow-overlay text-fg backdrop:bg-ink/40 m-auto w-[calc(100%-32px)] max-w-lg border p-0"
    >
      <div className="p-5 md:p-6">
        <div className="flex items-start justify-between gap-4">
          <h2 id="approve-title" className="text-h2">
            Duyệt đơn đăng ký của {applicantName}?
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
        <p className="mt-3">{APPROVE_NOTICE}</p>
        <div className="mt-4">
          <ScoreSummary criteria={criteria} scores={scores} />
        </div>
        <label className="mt-5 flex flex-col gap-2 text-sm font-semibold">
          Ghi chú nội bộ
          <textarea
            rows={3}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Không bắt buộc. Chỉ System Admin xem được."
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
          type="button"
          onClick={() => onConfirm(note)}
          className="btn btn-press btn-primary"
        >
          Duyệt đơn đăng ký
        </button>
      </div>
    </dialog>
  )
}
