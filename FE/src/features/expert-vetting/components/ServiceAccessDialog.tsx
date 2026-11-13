import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Modal } from '@/components/ui/feedback/modal'
import type { ServiceAccessAction } from '../types'

interface ServiceAccessDialogProps {
  action: ServiceAccessAction
  expertName: string
  serviceName?: string
  /** Note typed elsewhere (the approval panel); without it the dialog asks for one itself */
  note?: string
  onConfirm: (note: string) => Promise<unknown> | void
  onClose: () => void
}

/**
 * The one confirmation for suspending or reinstating an expert's service, used by the
 * approval panel and the expert drawer: same scope wording, same note rule, focus on Cancel.
 */
export function ServiceAccessDialog({
  action,
  expertName,
  serviceName,
  note: givenNote,
  onConfirm,
  onClose,
}: ServiceAccessDialogProps) {
  const { t } = useTranslation(['admin', 'common'])
  const [note, setNote] = useState(givenNote ?? '')
  const [tried, setTried] = useState(false)
  const [pending, setPending] = useState(false)
  const suspend = action === 'SUSPEND'
  const askNote = givenNote === undefined
  const noteMissing = suspend && !note.trim()
  const service = serviceName ?? t('serviceAccess.thisService')

  const confirm = async () => {
    setTried(true)
    if (noteMissing || pending) return
    setPending(true)
    try {
      await onConfirm(note.trim())
      onClose()
    } finally {
      setPending(false)
    }
  }

  return (
    <Modal
      title={
        suspend
          ? t('serviceAccess.suspendTitle', { service })
          : t('serviceAccess.reinstateTitle', { service })
      }
      description={
        suspend
          ? t('serviceAccess.suspendBody', { name: expertName, service })
          : t('serviceAccess.reinstateBody', { name: expertName, service })
      }
      onClose={onClose}
      preventClose={pending}
      footer={
        <>
          <button
            type="button"
            autoFocus={!askNote}
            onClick={onClose}
            disabled={pending}
            className="btn btn-press btn-secondary"
          >
            {t('common:actions.cancel')}
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => void confirm()}
            className={`btn btn-press ${suspend ? 'btn-danger' : 'btn-primary'}`}
          >
            {suspend
              ? t('serviceAccess.confirmSuspend')
              : t('serviceAccess.confirmReinstate')}
          </button>
        </>
      }
    >
      {askNote ? (
        <label className="mt-4 flex flex-col gap-2 text-sm font-semibold">
          {suspend
            ? t('serviceAccess.noteRequired')
            : t('serviceAccess.noteOptional')}
          <textarea
            rows={3}
            maxLength={2000}
            autoFocus
            value={note}
            aria-invalid={tried && noteMissing}
            aria-describedby={tried && noteMissing ? 'access-note-error' : undefined}
            onChange={(e) => setNote(e.target.value)}
            className="border-border-control rounded-control shadow-control bg-paper aria-[invalid=true]:border-danger resize-y border px-3 py-2 text-base font-normal"
          />
          {tried && noteMissing && (
            <span id="access-note-error" className="text-danger font-normal">
              {t('serviceAccess.noteMissing')}
            </span>
          )}
        </label>
      ) : (
        note.trim() && (
          <div className="bg-sunken rounded-surface mt-4 p-3 text-sm">
            <div className="text-fg-strong font-semibold">
              {t('finalApproval.confirmNote')}
            </div>
            <p className="mt-1 break-words whitespace-pre-wrap">{note}</p>
          </div>
        )
      )}
    </Modal>
  )
}
