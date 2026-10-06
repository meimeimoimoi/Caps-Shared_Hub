import { useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { LoaderCircle, LockKeyhole } from 'lucide-react'
import { draftApi } from '@/features/drafting/api/draftApi'
import { isDraftMock } from '@/features/drafting/api/dataSource'
import {
  useDraftAction,
  useDraftHref,
  useGeneration,
  useWorkspace,
} from '@/features/drafting/hooks/useDrafting'
import {
  DraftHeading,
  DraftButton,
  DraftLink,
  DraftLoading,
  DraftError,
  Paper,
} from '@/features/drafting/components/DraftUi'
import { ApiError } from '@/lib/api-client'

export default function DraftGenerationPage() {
  const { workspaceId, jobId } = useParams()
  const query = useGeneration(jobId)
  const workspace = useWorkspace(workspaceId)
  const navigate = useNavigate()
  const href = useDraftHref()
  const retryKey = useRef(crypto.randomUUID())
  const retry = useDraftAction((_: void, ctx) =>
    draftApi.generate(
      workspaceId!,
      query.data!.snapshotId,
      retryKey.current,
      ctx
    )
  )
  const job = query.data
  const matches = job?.workspaceId === workspaceId
  useEffect(() => {
    if (matches && job?.status === 'SUCCEEDED' && job.draftVersionId)
      navigate(href(`/drafts/${workspaceId}/versions/${job.draftVersionId}`), {
        replace: true,
      })
  }, [matches, job?.status, job?.draftVersionId, workspaceId, navigate, href])
  if (job && !matches)
    return (
      <DraftError
        error={
          new ApiError(
            'This generation job does not belong to this workspace.',
            404
          )
        }
      />
    )
  const snapshot = workspace.data?.snapshots.find(
    (value) => value.id === job?.snapshotId
  )
  return (
    <>
      <DraftHeading
        title={workspace.data?.title ?? 'Creating your draft'}
        description="Generation uses the confirmed snapshot and its pinned template version."
        step={3}
      />
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <Paper className="min-h-96">
          {query.isPending ? (
            <DraftLoading message="Checking generation status…" />
          ) : query.isError ? (
            <DraftError
              error={query.error}
              retry={() => void query.refetch()}
            />
          ) : job?.status === 'FAILED' ? (
            <div className="space-y-5">
              <DraftError
                error={
                  new Error(
                    job.error ?? 'Generation failed. The snapshot is preserved.'
                  )
                }
              />
              <p className="text-fg-muted text-sm">
                {job.billingMessage ??
                  'Billing has not been confirmed. Check the transaction status before assuming any charge.'}
              </p>
              <DraftButton
                disabled={retry.isPending}
                onClick={() =>
                  retry.mutate(undefined, {
                    onSuccess: (next) =>
                      navigate(
                        href(`/drafts/${workspaceId}/generations/${next.id}`),
                        { replace: true }
                      ),
                  })
                }
              >
                {retry.isPending
                  ? 'Starting retry…'
                  : 'Retry with this snapshot'}
              </DraftButton>
              {retry.isError && <DraftError error={retry.error} />}
            </div>
          ) : (
            <div
              role="status"
              className="flex min-h-80 flex-col items-center justify-center gap-5 text-center"
            >
              <LoaderCircle
                size={30}
                className="text-accent motion-safe:animate-spin"
                aria-hidden="true"
              />
              <h2 className="text-h2">
                {job?.status === 'QUEUED'
                  ? 'Your draft is queued'
                  : job?.status === 'SUCCEEDED'
                    ? 'Opening your draft'
                    : 'Creating your draft'}
              </h2>
              <p className="text-fg-muted max-w-md">
                {job?.stage ??
                  'The service is processing your confirmed input. Progress details are not available.'}
              </p>
              {isDraftMock && (
                <p className="text-caption text-warning">
                  Generation stages and latency are simulated.
                </p>
              )}
              <DraftButton
                secondary
                disabled={query.isFetching}
                onClick={() => void query.refetch()}
              >
                Check status
              </DraftButton>
            </div>
          )}
          {query.isError && (
            <p className="text-fg-muted mt-4 text-sm">
              A connection error does not mean the job failed. Check this job
              again; no new job has been created.
            </p>
          )}
        </Paper>
        <aside className="space-y-4">
          <Paper>
            <LockKeyhole size={20} className="text-accent mb-4" />
            <h2 className="text-h2">Confirmed input</h2>
            <p className="mt-3 text-sm">
              {snapshot
                ? `Snapshot v${snapshot.version} · Immutable`
                : 'Checking snapshot reference…'}
            </p>
            <p className="text-caption text-fg-muted mt-2 break-all">
              {job?.snapshotId}
            </p>
            <p className="text-caption text-fg-muted mt-4">
              No draft version or export is available until generation succeeds.
              Readiness is assessed separately.
            </p>
          </Paper>
          <DraftLink to={`/drafts/${workspaceId}/input`}>
            Back to working input
          </DraftLink>
          <DraftLink to={`/drafts/${workspaceId}/history`}>
            Open previous versions
          </DraftLink>
        </aside>
      </div>
    </>
  )
}
