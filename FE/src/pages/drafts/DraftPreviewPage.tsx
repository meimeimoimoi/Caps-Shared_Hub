import { DraftUiError } from '@/features/drafting/utils/DraftUiError'
import { useDraftPresentation } from '@/features/drafting/hooks/useDraftPresentation'
import { useTranslation } from 'react-i18next'
import { useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { draftApi, draftCapabilities } from '@/features/drafting/api/draftApi'
import {
  useDraftAction,
  useDraftHref,
  useDraftVersion,
  useTemplate,
  useWorkspace,
} from '@/features/drafting/hooks/useDrafting'
import {
  DraftHeading,
  DraftButton,
  DraftLink,
  DraftLoading,
  DraftError,
  Paper,
  ReadinessBadge,
} from '@/features/drafting/components/DraftUi'
import { SnapshotDetails } from '@/features/drafting/components/SnapshotDetails'
import { CitationDetails } from '@/features/drafting/components/CitationDetails'
import { DocumentPreview } from '@/features/drafting/components/DocumentPreview'
import { ReadinessPanel } from '@/features/drafting/components/ReadinessPanel'
import { ExportDraftDialog } from '@/features/drafting/components/ExportDraftDialog'
import { ReviewHandoffSummary } from '@/features/drafting/components/ReviewHandoffSummary'
import { normalizeInput } from '@/features/drafting/utils/validation'
import type {
  Citation,
  DraftVersion,
  Snapshot,
  TemplateVersion,
  Workspace,
} from '@/features/drafting/types'

function Preview({
  draft,
  workspace,
  snapshot,
  template,
}: {
  draft: DraftVersion
  workspace: Workspace
  snapshot: Snapshot
  template: TemplateVersion
}) {
  const display = useDraftPresentation()

  const { t } = useTranslation('drafting')

  const [citation, setCitation] = useState<Citation | null>(null)
  const [showSnapshot, setShowSnapshot] = useState(false)
  const [params] = useSearchParams()
  const [showExport, setShowExport] = useState(Boolean(params.get('exportId')))
  const [showReview, setShowReview] = useState(false)
  const regenerateKey = useRef(crypto.randomUUID())
  const href = useDraftHref()
  const navigate = useNavigate()
  const regenerate = useDraftAction((_: void, ctx) =>
    draftApi.generate(
      workspace.id,
      draft.snapshotId,
      regenerateKey.current,
      ctx
    )
  )
  const staleInput =
    JSON.stringify(normalizeInput(workspace.input, template.fields)) !==
    JSON.stringify(normalizeInput(snapshot.input, template.fields))
  const openCitation = (id: string) =>
    setCitation(draft.citations.find((value) => value.id === id) ?? null)
  const assessed = draft.assessment.status === 'COMPLETED'
  return (
    <>
      <DraftHeading
        title={draft.title}
        description={t('previewMetadata', {
          draft: display.number(draft.version),
          snapshot: display.number(snapshot.version),
          template: display.number(template.version),
          time: display.timestamp(draft.generatedAt),
        })}
        step={4}
      >
        <ReadinessBadge assessment={draft.assessment} />
      </DraftHeading>
      {staleInput && (
        <p
          role="status"
          className="rounded-control border-warning/30 bg-warning-soft text-warning mb-6 border p-4 text-sm"
        >
          {t(
            'workingInputDiffersFromTheSnapshotOfThisVersionThisDraftStillShowsItsOriginalConfirmedInput'
          )}
        </p>
      )}
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <DocumentPreview draft={draft} onCitation={openCitation} />
        <aside className="min-w-0 space-y-5">
          <Paper className="!p-5">
            <ReadinessPanel draft={draft} onCitation={openCitation} />
          </Paper>
          <Paper className="!p-5">
            <h2 className="text-h2">{t('traceabilityActions')}</h2>
            <dl className="mt-4 space-y-3 text-sm">
              <div>
                <dt className="text-caption text-fg-muted">{t('template')}</dt>
                <dd>
                  {template.title} · v{template.version}
                </dd>
              </div>
              <div>
                <dt className="text-caption text-fg-muted">
                  {t('confirmedInput')}
                </dt>
                <dd>
                  <button
                    className="text-accent-text min-h-11 underline-offset-4 hover:underline"
                    onClick={() => setShowSnapshot(true)}
                  >
                    {t('snapshotVersion', {
                      version: display.number(snapshot.version),
                    })}{' '}
                    {'·'} {t('immutable')}
                  </button>
                </dd>
              </div>
            </dl>
            <h3 className="mt-4 text-sm font-semibold">{t('sources')}</h3>
            {draft.citations.length ? (
              <ol className="mt-2 space-y-2">
                {draft.citations.map((source, index) => (
                  <li key={source.id}>
                    <button
                      className="rounded-control border-border hover:bg-sunken min-h-11 w-full border p-3 text-left text-sm"
                      onClick={() => setCitation(source)}
                    >
                      <span className="text-accent-text">[{index + 1}]</span>{' '}
                      {source.sourceTitle}
                      <span className="text-caption text-fg-muted mt-1 block">
                        {source.sourceVersion}
                        {source.synthetic ? ' · ' + t('synthetic') : ''}
                      </span>
                    </button>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-danger mt-2 text-sm">
                {t('noGroundedSourceReferencesAreAvailable')}
              </p>
            )}
            <div className="border-border mt-5 space-y-3 border-t pt-5">
              <DraftButton
                className="w-full"
                disabled={!assessed || !draft.actions.review.allowed}
                onClick={() => setShowReview(true)}
              >
                {t('requestExpertReview')}
              </DraftButton>
              {!draft.actions.review.allowed && (
                <p className="text-caption text-fg-muted">
                  {display.demoCopy(draft.actions.review.reason)}
                </p>
              )}
              {!draftCapabilities.review && (
                <p className="text-caption text-fg-muted">
                  {t(
                    'reviewSubmissionIsNotConnectedYouCanInspectTheHandoffSummary'
                  )}
                </p>
              )}
              <DraftButton
                secondary
                className="w-full"
                disabled={!assessed || !draft.actions.export.allowed}
                onClick={() => setShowExport(true)}
              >
                {t('exportDraft')}
              </DraftButton>
              {!draft.actions.export.allowed && (
                <p className="text-caption text-fg-muted">
                  {display.demoCopy(draft.actions.export.reason)}
                </p>
              )}
              {!draftCapabilities.export && (
                <p className="text-caption text-fg-muted">
                  {t('exportFormatsAndChargingPolicyAreNotConnected')}
                </p>
              )}
              <DraftLink
                to={`/drafts/${workspace.id}/input?fromVersion=${draft.id}`}
              >
                {t('reviseInput')}
              </DraftLink>
              <DraftButton
                secondary
                className="w-full"
                disabled={
                  regenerate.isPending || !draft.actions.regenerate.allowed
                }
                onClick={() =>
                  regenerate.mutate(undefined, {
                    onSuccess: (job) =>
                      navigate(
                        href(`/drafts/${workspace.id}/generations/${job.id}`)
                      ),
                  })
                }
              >
                {regenerate.isPending
                  ? t('startingGeneration')
                  : t('regenerateFromThisSnapshot')}
              </DraftButton>
              {!draft.actions.regenerate.allowed && (
                <p className="text-caption text-fg-muted">
                  {draft.actions.regenerate.reason}
                </p>
              )}
              <p className="text-caption text-fg-muted">
                {t('regenerationCreatesANewDraftVersionUsingTheSameSnapshot')}
              </p>
              <DraftLink
                to={`/drafts/${workspace.id}/history?selected=${draft.id}`}
              >
                {t('viewVersionHistory')}
              </DraftLink>
              {regenerate.isError && <DraftError error={regenerate.error} />}
            </div>
          </Paper>
        </aside>
      </div>
      {citation && (
        <CitationDetails
          citation={citation}
          onClose={() => setCitation(null)}
        />
      )}
      {showSnapshot && (
        <SnapshotDetails
          snapshot={snapshot}
          fields={template.fields}
          onClose={() => setShowSnapshot(false)}
        />
      )}
      <ExportDraftDialog
        draft={draft}
        open={showExport}
        onClose={() => setShowExport(false)}
        resumeExportId={params.get('exportId') ?? undefined}
      />
      <ReviewHandoffSummary
        draft={draft}
        open={showReview}
        onClose={() => setShowReview(false)}
      />
    </>
  )
}
export default function DraftPreviewPage() {
  const { t } = useTranslation('drafting')

  const { workspaceId, draftVersionId } = useParams()
  const query = useDraftVersion(draftVersionId)
  const workspace = useWorkspace(workspaceId)
  const template = useTemplate(query.data?.templateVersionId)
  if (
    query.isPending ||
    workspace.isPending ||
    (query.data && template.isPending)
  )
    return (
      <DraftLoading message={t('loadingThisDraftVersionAndItsReferences')} />
    )
  if (query.isError || workspace.isError || template.isError)
    return (
      <DraftError
        error={query.error ?? workspace.error ?? template.error}
        retry={() => {
          void query.refetch()
          void workspace.refetch()
          void template.refetch()
        }}
      />
    )
  const snapshot = workspace.data?.snapshots.find(
    (value) => value.id === query.data?.snapshotId
  )
  if (
    !query.data ||
    !workspace.data ||
    !template.data ||
    !snapshot ||
    query.data.workspaceId !== workspaceId ||
    snapshot.templateVersionId !== query.data.templateVersionId
  )
    return (
      <DraftError
        error={
          new DraftUiError(
            'thisVersionOrItsExactReferencesAreUnavailableNoSubstituteVersionHasBeenOpened',
            404
          )
        }
      />
    )
  return (
    <Preview
      key={query.data.id}
      draft={query.data}
      workspace={workspace.data}
      template={template.data}
      snapshot={snapshot}
    />
  )
}
