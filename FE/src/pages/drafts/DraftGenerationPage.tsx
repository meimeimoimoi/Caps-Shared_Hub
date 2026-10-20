import { DraftUiError } from '@/features/drafting/utils/DraftUiError'
import { useDraftPresentation } from '@/features/drafting/hooks/useDraftPresentation'
import { useTranslation } from 'react-i18next'
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

export default function DraftGenerationPage() {
  const display = useDraftPresentation()

  const { t } = useTranslation('drafting')

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
          new DraftUiError('thisGenerationJobDoesNotBelongToThisWorkspace', 404)
        }
      />
    )
  const snapshot = workspace.data?.snapshots.find(
    (value) => value.id === job?.snapshotId
  )
  return (
    <>
      <DraftHeading
        title={workspace.data?.title ?? t('creatingYourDraft')}
        description={t(
          'generationUsesTheConfirmedSnapshotAndItsPinnedTemplateVersion'
        )}
        step={3}
      />
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <Paper className="min-h-96">
          {query.isPending ? (
            <DraftLoading message={t('checkingGenerationStatus')} />
          ) : query.isError ? (
            <DraftError
              error={query.error}
              retry={() => void query.refetch()}
            />
          ) : job?.status === 'FAILED' ? (
            <div className="space-y-5">
              <DraftError
                error={
                  new DraftUiError('generationFailedTheSnapshotIsPreserved')
                }
              />
              <p className="text-fg-muted text-sm">
                {display.demoCopy(job.billingMessage) ||
                  t(
                    'billingHasNotBeenConfirmedCheckTheTransactionStatusBeforeAssumingAnyCharge'
                  )}
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
                  ? t('startingRetry')
                  : t('retryWithThisSnapshot')}
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
                  ? t('yourDraftIsQueued')
                  : job?.status === 'SUCCEEDED'
                    ? t('openingYourDraft')
                    : t('creatingYourDraft')}
              </h2>
              <p className="text-fg-muted max-w-md">
                {display.demoCopy(job?.stage) ||
                  t(
                    'theServiceIsProcessingYourConfirmedInputProgressDetailsAreNotAvailable'
                  )}
              </p>
              {isDraftMock && (
                <p className="text-caption text-warning">
                  {t('generationStagesAndLatencyAreSimulated')}
                </p>
              )}
              <DraftButton
                secondary
                disabled={query.isFetching}
                onClick={() => void query.refetch()}
              >
                {t('checkStatus')}
              </DraftButton>
            </div>
          )}
          {query.isError && (
            <p className="text-fg-muted mt-4 text-sm">
              {t(
                'aConnectionErrorDoesNotMeanTheJobFailedCheckThisJobAgainNoNewJobHasBeenCreated'
              )}
            </p>
          )}
        </Paper>
        <aside className="space-y-4">
          <Paper>
            <LockKeyhole size={20} className="text-accent mb-4" />
            <h2 className="text-h2">{t('confirmedInput')}</h2>
            <p className="mt-3 text-sm">
              {snapshot
                ? t('snapshotImmutable', {
                    version: display.number(snapshot.version),
                  })
                : t('checkingSnapshotReference')}
            </p>
            <p className="text-caption text-fg-muted mt-2 break-all">
              {job?.snapshotId}
            </p>
            <p className="text-caption text-fg-muted mt-4">
              {t(
                'noDraftVersionOrExportIsAvailableUntilGenerationSucceedsReadinessIsAssessedSeparately'
              )}
            </p>
          </Paper>
          <DraftLink to={`/drafts/${workspaceId}/input`}>
            {t('backToWorkingInput')}
          </DraftLink>
          <DraftLink to={`/drafts/${workspaceId}/history`}>
            {t('openPreviousVersions')}
          </DraftLink>
        </aside>
      </div>
    </>
  )
}
