import { useEffect, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Modal } from '@/components/ui/feedback/modal'
import { ApiError } from '@/lib/api-client'
import { draftApi } from '../api/draftApi'
import { draftKeys } from '../api/queryKeys'
import { useDraftAction, useDraftContext } from '../hooks/useDrafting'
import { draftDisclaimer } from '../constants'
import { DraftButton, DraftError, DraftLoading } from './DraftUi'
import { safeSourceUrl } from '../utils/sourceUrl'
import type { DraftVersion, ExportResult } from '../types'

export function ExportDraftDialog({
  draft,
  open,
  onClose,
  resumeExportId,
}: {
  draft: DraftVersion
  open: boolean
  onClose: () => void
  resumeExportId?: string
}) {
  const ctx = useDraftContext()
  const [acknowledged, setAcknowledged] = useState(false)
  const [format, setFormat] = useState('')
  const [result, setResult] = useState<ExportResult | null>(null)
  const [downloadError, setDownloadError] = useState<Error | null>(null)
  const [downloadStarted, setDownloadStarted] = useState(false)
  const [clock, setClock] = useState(() => Date.now())
  const exportKey = useRef(crypto.randomUUID())
  const failedDownload = useRef(false)
  const quote = useQuery({
    queryKey: draftKeys.item(ctx.scope, ctx.scenario, 'quote', draft.id),
    queryFn: ({ signal }) => draftApi.quote(draft.id, { ...ctx, signal }),
    enabled: open && !result && !resumeExportId,
    retry: false,
    staleTime: 0,
    refetchOnWindowFocus: false,
  })
  const resumed = useQuery({
    queryKey: draftKeys.item(ctx.scope, ctx.scenario, 'export', resumeExportId),
    queryFn: ({ signal }) =>
      draftApi.exportResult(resumeExportId!, { ...ctx, signal }),
    enabled: open && Boolean(resumeExportId),
    retry: false,
  })
  const currentResult = result ?? resumed.data
  const selectedFormat = format || quote.data?.formats[0] || ''
  const submit = useDraftAction(async (_: void, context) => {
    const output = await draftApi.export(
      draft.id,
      quote.data!.id,
      selectedFormat,
      exportKey.current,
      context
    )
    if (output.draftVersionId !== draft.id)
      throw new Error(
        'The returned export does not match this draft. Download has been blocked.'
      )
    return output
  })
  const reconcile = useDraftAction(async (_: void, context) => {
    const output = await draftApi.exportResult(currentResult!.id, context)
    if (output.draftVersionId !== draft.id)
      throw new Error('The returned artifact belongs to another draft version.')
    return output
  })
  useEffect(() => {
    const expiresAt = quote.data?.expiresAt
    if (!expiresAt) return
    const remaining = Date.parse(expiresAt) - Date.now()
    if (!Number.isFinite(remaining)) return
    const timer = setTimeout(
      () => setClock(Date.now()),
      Math.max(0, Math.min(remaining, 2147483647))
    )
    return () => clearTimeout(timer)
  }, [quote.data?.expiresAt])
  const expired = Boolean(
    quote.data?.expiresAt &&
    Date.parse(quote.data.expiresAt) <= Math.max(clock, quote.dataUpdatedAt)
  )
  const busy = submit.isPending || reconcile.isPending
  function download() {
    if (
      !currentResult ||
      currentResult.status !== 'SUCCEEDED' ||
      currentResult.draftVersionId !== draft.id
    )
      return
    try {
      if (
        ctx.scenario === 'artifact-download-failed' &&
        !failedDownload.current
      ) {
        failedDownload.current = true
        throw new Error(
          'Simulated download failure. The artifact already exists; retry the download without exporting or charging again.'
        )
      }
      const link = document.createElement('a')
      let objectUrl: string | undefined
      if (currentResult.text !== undefined) {
        objectUrl = URL.createObjectURL(
          new Blob([currentResult.text], { type: 'text/plain;charset=utf-8' })
        )
        link.href = objectUrl
      } else {
        const url = safeSourceUrl(currentResult.downloadUrl)
        if (!url)
          throw new Error(
            'The artifact has no valid download URL. Retrieve the existing artifact again.'
          )
        link.href = url
      }
      link.download = currentResult.filename ?? 'shared-hub-draft.txt'
      link.rel = 'noopener noreferrer'
      document.body.append(link)
      link.click()
      link.remove()
      if (objectUrl) setTimeout(() => URL.revokeObjectURL(objectUrl!), 1000)
      setDownloadError(null)
      setDownloadStarted(true)
    } catch (error) {
      setDownloadError(
        error instanceof Error ? error : new Error('Download failed.')
      )
    }
  }
  if (!open) return null
  const wrongVersion =
    currentResult && currentResult.draftVersionId !== draft.id
  return (
    <Modal
      title={`Export Draft v${draft.version}`}
      closeLabel="Close export dialog"
      description={`Snapshot ${draft.snapshotId} · Template ${draft.templateVersionId}`}
      preventClose={busy}
      onClose={onClose}
      footer={
        <>
          <DraftButton secondary disabled={busy} onClick={onClose}>
            Close
          </DraftButton>
          {currentResult && !wrongVersion ? (
            currentResult.status === 'PENDING_RECONCILIATION' ? (
              <DraftButton
                disabled={busy}
                onClick={() =>
                  reconcile.mutate(undefined, { onSuccess: setResult })
                }
              >
                Check transaction status
              </DraftButton>
            ) : (
              <DraftButton disabled={busy} onClick={download}>
                {downloadStarted
                  ? 'Download artifact again'
                  : 'Download artifact'}
              </DraftButton>
            )
          ) : (
            !resumeExportId && (
              <DraftButton
                disabled={
                  busy ||
                  !acknowledged ||
                  !quote.data?.eligibility.allowed ||
                  expired ||
                  !selectedFormat ||
                  quote.data?.draftVersionId !== draft.id
                }
                onClick={() =>
                  submit.mutate(undefined, { onSuccess: setResult })
                }
              >
                {submit.isPending ? 'Exporting…' : 'Confirm export'}
              </DraftButton>
            )
          )}
        </>
      }
    >
      <p className="rounded-control bg-sunken mt-5 p-4 text-sm">
        {draftDisclaimer}
      </p>
      {wrongVersion ? (
        <DraftError
          error={
            new Error(
              'This artifact belongs to a different draft version. No download is available here.'
            )
          }
        />
      ) : currentResult ? (
        <div className="mt-5 space-y-3">
          <p role="status" className="rounded-control bg-sunken p-4 text-sm">
            {currentResult.message}
          </p>
          <p className="text-caption text-fg-muted break-all">
            Artifact reference: {currentResult.id}
          </p>
          {downloadStarted && (
            <p role="status" className="text-success text-sm">
              Download requested. You can retrieve this same artifact again.
            </p>
          )}
        </div>
      ) : resumeExportId ? (
        resumed.isPending ? (
          <DraftLoading message="Retrieving the existing artifact…" />
        ) : (
          <DraftError
            error={resumed.error}
            retry={() => void resumed.refetch()}
          />
        )
      ) : (
        <>
          {quote.isPending ? (
            <DraftLoading message="Loading export conditions…" />
          ) : quote.isError ? (
            <div className="mt-5">
              <DraftError
                error={quote.error}
                retry={() => void quote.refetch()}
              />
            </div>
          ) : (
            <div className="mt-5 space-y-4">
              <p className="text-sm">{quote.data?.description}</p>
              {!quote.data?.eligibility.allowed && (
                <p role="alert" className="text-danger text-sm">
                  {quote.data?.eligibility.reason ?? 'Export is unavailable.'}
                </p>
              )}
              <label className="block text-sm font-medium">
                Format
                <select
                  value={selectedFormat}
                  onChange={(event) => setFormat(event.target.value)}
                  disabled={busy}
                  className="rounded-control border-border-control bg-paper mt-2 min-h-11 w-full border px-3"
                >
                  {quote.data?.formats.map((value) => (
                    <option key={value} value={value}>
                      {value === 'txt'
                        ? 'TXT — demo text file'
                        : value.toUpperCase()}
                    </option>
                  ))}
                </select>
              </label>
              {expired && (
                <p role="alert" className="text-danger text-sm">
                  This quote has expired. Reload it and confirm the new
                  conditions.
                </p>
              )}
              {(expired ||
                (submit.error instanceof ApiError &&
                  submit.error.code === 'QUOTE_EXPIRED')) &&
                !busy && (
                  <DraftButton
                    secondary
                    onClick={() => {
                      setAcknowledged(false)
                      exportKey.current = crypto.randomUUID()
                      submit.reset()
                      void quote.refetch()
                    }}
                  >
                    Reload quote
                  </DraftButton>
                )}
              <label className="flex items-start gap-3 text-sm">
                <input
                  type="checkbox"
                  checked={acknowledged}
                  disabled={busy}
                  className="accent-accent mt-1 size-5 shrink-0"
                  onChange={(event) => setAcknowledged(event.target.checked)}
                />
                <span>
                  I understand this is an AI-assisted draft, and I have read the
                  export conditions for this version.
                </span>
              </label>
            </div>
          )}
        </>
      )}
      {submit.isError && (
        <div className="mt-4">
          <DraftError error={submit.error} />
          <p className="text-caption text-fg-muted mt-2">
            Retry retains the same operation reference. A timeout does not
            confirm the billing result.
          </p>
        </div>
      )}
      {reconcile.isError && <DraftError error={reconcile.error} />}
      {downloadError && (
        <div className="mt-4">
          <DraftError error={downloadError} />
        </div>
      )}
    </Modal>
  )
}
