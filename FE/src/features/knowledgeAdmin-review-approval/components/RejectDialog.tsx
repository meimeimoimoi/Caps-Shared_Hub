import { useState } from 'react'
import { Modal } from '@/components/ui/feedback/modal'

interface RejectDialogProps {
  title: string
  description: string
  confirmLabel: string
  /** Label of the mandatory reason field */
  reasonLabel?: string
  onClose: () => void
  /** Keep the dialog open and show an error when the action fails. */
  onConfirm: (reason: string) => Promise<unknown>
}

/* Document/version action dialog with a mandatory reason. */
export function RejectDialog({
  title,
  description,
  confirmLabel,
  reasonLabel = 'Lý do từ chối (bắt buộc)',
  onClose,
  onConfirm,
}: RejectDialogProps) {
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  return (
    <Modal
      title={title}
      description={description}
      onClose={onClose}
      // Native validation catches empty input; trimming also rejects whitespace.
      onSubmit={() => {
        if (busy) return
        if (!reason.trim()) {
          setError('Vui lòng nhập lý do.')
          return
        }
        setBusy(true)
        setError(null)
        onConfirm(reason.trim()).catch((e: Error) => {
          setBusy(false)
          setError(e.message)
        })
      }}
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="btn btn-press btn-secondary"
          >
            Hủy
          </button>
          <button
            type="submit"
            disabled={busy}
            className="btn btn-press bg-danger text-paper"
          >
            {confirmLabel}
          </button>
        </>
      }
    >
      <label className="mt-5 flex flex-col gap-2 text-sm font-semibold">
        {reasonLabel}
        <textarea
          required
          rows={3}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="border-border-control rounded-control shadow-control bg-paper placeholder:text-fg-muted resize-y border px-3 py-2 text-base font-normal"
        />
      </label>
      {error && (
        <p role="alert" className="text-danger mt-2 text-sm">
          {error}
        </p>
      )}
    </Modal>
  )
}
