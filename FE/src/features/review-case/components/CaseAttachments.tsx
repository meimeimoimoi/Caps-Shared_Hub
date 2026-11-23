import { useId, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { Download, FileText, Paperclip } from 'lucide-react'
import { ApiError } from '@/lib/api-client'
import {
  addCaseAttachment,
  downloadCaseAttachment,
  downloadSourceFile,
  listCaseAttachments,
  type AttachmentScope,
} from '../api/reviewCaseApi'
import {
  reviewCaseKeys,
  useCaseError,
  useCaseRun,
} from '../hooks/useReviewCases'
import type { AttachmentDto } from '../types'
import { useCaseFormat } from '../ui'

export const MAX_BYTES = 50 * 1024 * 1024
export const ACCEPT = '.pdf,.jpg,.jpeg,.png,.webp,.docx'

const sizeLabel = (bytes: number) =>
  bytes < 1024 * 1024
    ? `${Math.max(1, Math.round(bytes / 1024))} KB`
    : `${(bytes / (1024 * 1024)).toFixed(1)} MB`

// Always saved, never opened in this origin: the file comes from the other party
async function save(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = name
  link.click()
  URL.revokeObjectURL(url)
}

export function CaseAttachments({
  caseId,
  scope = 'party',
  canUpload = false,
  requesterUserId,
  dispute,
}: {
  caseId: string
  scope?: AttachmentScope
  canUpload?: boolean
  /** A case has two parties, so a file the client did not add is the expert's. */
  requesterUserId?: string
  /** For the arbiter: files split by party, and those added once the dispute opened are marked */
  dispute?: { clientUserId: string; openedAt: string }
}) {
  const { t } = useTranslation('reviewCase')
  const f = useCaseFormat()
  const id = useId()
  const toMessage = useCaseError()
  const [error, setError] = useState<string | null>(null)
  const files = useQuery({
    queryKey: [...reviewCaseKeys.attachments(caseId), scope],
    queryFn: ({ signal }) => listCaseAttachments(caseId, scope, signal),
  })

  const download = (a: AttachmentDto) => {
    setError(null)
    downloadCaseAttachment(caseId, a.id, scope)
      .then((blob) => save(blob, a.fileName))
      .catch((e: unknown) => setError(toMessage(e)))
  }
  const downloadSource = () => {
    setError(null)
    downloadSourceFile(caseId, scope)
      .then((blob) => save(blob, t('live.files.sourceName')))
      .catch((e: unknown) =>
        setError(
          e instanceof ApiError && e.status === 404
            ? t('live.files.noSource')
            : toMessage(e)
        )
      )
  }

  return (
    <section className="paper p-5" aria-labelledby={`${id}-title`}>
      <h2 id={`${id}-title`} className="eyebrow font-sans">
        {t('live.files.title')}
      </h2>
      <button
        type="button"
        onClick={downloadSource}
        className="btn btn-secondary mt-3 w-full"
      >
        <Download size={16} aria-hidden="true" />
        {t('live.files.source')}
      </button>
      {dispute && files.data?.length ? (
        (['client', 'expert'] as const).map((party) => {
          const mine = files.data.filter(
            (a) => (a.uploadedBy === dispute.clientUserId) === (party === 'client')
          )
          return (
            <div key={party} className="mt-4">
              <h3 className="text-fg-strong text-sm font-semibold">
                {t(`live.files.evidence.${party}`)}
              </h3>
              {mine.length ? (
                list(mine)
              ) : (
                <p className="text-fg-muted mt-1 text-sm">{t('live.files.evidence.none')}</p>
              )}
            </div>
          )
        })
      ) : files.data?.length ? (
        list(files.data)
      ) : (
        <p className="text-fg-muted mt-2 text-sm">{t('live.files.empty')}</p>
      )}
      {canUpload && <EvidenceUpload caseId={caseId} />}
      {error && (
        <p role="alert" className="text-danger mt-2 text-sm">
          {error}
        </p>
      )}
    </section>
  )

  function list(items: AttachmentDto[]) {
    return (
        <ul className="mt-3 space-y-2 text-sm">
          {items.map((a) => (
            <li key={a.id} className="flex items-start gap-2">
              <FileText
                size={14}
                aria-hidden="true"
                className="text-fg-muted mt-1 shrink-0"
              />
              <span className="min-w-0 flex-1">
                <span className="text-fg-strong block break-words">
                  {a.fileName}
                </span>
                {requesterUserId && a.uploadedBy !== requesterUserId && (
                  <span className="text-caption text-accent block font-semibold">
                    {t('live.files.fromExpert')}
                  </span>
                )}
                {dispute && a.uploadedAt >= dispute.openedAt && (
                  <span className="text-caption text-warning block font-semibold">
                    {t('live.files.evidence.duringDispute')}
                  </span>
                )}
                <span className="text-fg-muted text-caption num">
                  {sizeLabel(a.sizeBytes)} · {f.at(a.uploadedAt)}
                </span>
              </span>
              <button
                type="button"
                onClick={() => download(a)}
                aria-label={t('live.files.download', { name: a.fileName })}
                className="btn btn-ghost !min-h-0 shrink-0 !p-1.5"
              >
                <Download size={15} aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
    )
  }
}

/** Adds one file to the case; any open list of the case's files refreshes. Also used inside the dispute cards. */
export function EvidenceUpload({ caseId, label }: { caseId: string; label?: string }) {
  const { t } = useTranslation('reviewCase')
  const id = useId()
  const toMessage = useCaseError()
  const { run, busy } = useCaseRun()
  const [error, setError] = useState<string | null>(null)

  const upload = (file: File | undefined) => {
    if (!file) return
    setError(null)
    if (file.size > MAX_BYTES) return setError(t('errors.ATTACHMENT_TOO_LARGE'))
    run(() => addCaseAttachment(caseId, file), {
      onError: (e) => setError(toMessage(e)),
    })
  }

  return (
    <div>
      <label className="btn btn-secondary has-[:focus-visible]:outline-ink mt-4 w-full cursor-pointer has-[:focus-visible]:outline-2">
        <Paperclip size={16} aria-hidden="true" />
        {busy ? t('live.files.uploading') : (label ?? t('live.files.add'))}
        <input
          type="file"
          accept={ACCEPT}
          disabled={busy}
          aria-describedby={`${id}-hint`}
          onChange={(e) => {
            upload(e.target.files?.[0])
            e.target.value = ''
          }}
          className="sr-only"
        />
      </label>
      <p id={`${id}-hint`} className="text-fg-muted text-caption mt-2">
        {t('live.files.hint')}
      </p>
      {error && (
        <p role="alert" className="text-danger mt-2 text-sm">
          {error}
        </p>
      )}
    </div>
  )
}
