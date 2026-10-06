import { DraftUiError } from '@/features/drafting/utils/DraftUiError'
import { useDraftPresentation } from '@/features/drafting/hooks/useDraftPresentation'
import { useTranslation } from 'react-i18next'
import { useEffect, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Modal } from '@/components/ui/feedback/modal'
import { ApiError } from '@/lib/api-client'
import { isDraftMock } from '@/features/drafting/api/dataSource'
import {
  useDraftHref,
  useDraftVersion,
  useTemplate,
  useWorkspace,
} from '@/features/drafting/hooks/useDrafting'
import { useDraftInput } from '@/features/drafting/hooks/useDraftInput'
import { SchemaForm } from '@/features/drafting/components/SchemaForm'
import {
  InputSummary,
  SnapshotDetails,
} from '@/features/drafting/components/SnapshotDetails'
import {
  DraftHeading,
  DraftButton,
  DraftLink,
  DraftLoading,
  DraftError,
  Paper,
} from '@/features/drafting/components/DraftUi'

import type {
  Snapshot,
  TemplateVersion,
  Workspace,
} from '@/features/drafting/types'

function InputEditor({
  workspace,
  template,
  source,
  fromVersion,
}: {
  workspace: Workspace
  template: TemplateVersion
  source?: Snapshot
  fromVersion?: string
}) {
  const display = useDraftPresentation()

  const { t } = useTranslation('drafting')

  const editor = useDraftInput(workspace, template, source)
  const [selected, setSelected] = useState<Snapshot | null>(null)
  const href = useDraftHref()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const fieldToFocus = params.get('field')
  useEffect(() => {
    if (fieldToFocus)
      document.getElementById(`draft-field-${fieldToFocus}`)?.focus()
  }, [fieldToFocus])
  const conflict =
    (editor.save.error instanceof ApiError &&
      editor.save.error.status === 409) ||
    (editor.confirm.error instanceof ApiError &&
      editor.confirm.error.status === 409)
  return (
    <>
      <DraftHeading
        title={workspace.title}
        description={
          source
            ? t('revisionDescription', {
                version: display.number(source.version),
              })
            : t(
                'enterTheFactsAndAmountsForThisDocumentOnlyConfirmedInputCanBeUsedToCreateADraft'
              )
        }
        step={editor.dialog ? 2 : 1}
      >
        <DraftLink
          to={
            fromVersion
              ? `/drafts/${workspace.id}/versions/${fromVersion}`
              : '/drafts'
          }
        >
          {source ? t('cancelRevision') : t('allWorkspaces')}
        </DraftLink>
      </DraftHeading>
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <Paper>
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3 text-sm">
            <p className="text-fg-muted">
              {t('inputRevision', {
                template: display.number(template.version),
                revision: display.number(editor.revision),
              })}
            </p>
            <span className="rounded-control bg-sunken px-3 py-1">
              {editor.dirty
                ? t('unsavedChanges')
                : t('workingInputNotConfirmed')}
            </span>
          </div>
          {isDraftMock && template.schemaNote && (
            <p className="rounded-control bg-warning-soft text-caption text-warning mb-6 p-4">
              {template.schemaNote}
            </p>
          )}
          {Object.keys(editor.errors).length > 0 && (
            <div
              role="alert"
              className="rounded-control border-danger/30 bg-danger-soft text-danger mb-6 border p-4"
            >
              <p className="font-semibold">
                {t('checkTheFollowingFieldsBeforeConfirmation')}
              </p>
              <ul className="mt-2 space-y-1">
                {Object.entries(editor.errors).map(([field, message]) => (
                  <li key={field}>
                    <a
                      className="underline"
                      href={`#draft-field-${field}`}
                      onClick={(event) => {
                        event.preventDefault()
                        document.getElementById(`draft-field-${field}`)?.focus()
                      }}
                    >
                      {message}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <form
            noValidate
            onSubmit={(event) => {
              event.preventDefault()
              editor.openConfirm()
            }}
          >
            <SchemaForm
              fields={template.fields}
              input={editor.input}
              errors={editor.errors}
              disabled={editor.busy}
              setValue={editor.setValue}
            />
            <div className="border-border mt-8 flex flex-wrap items-center justify-between gap-4 border-t pt-5">
              <p role="status" className="text-caption text-fg-muted">
                {editor.savedAt
                  ? `${isDraftMock ? t('savedInDemoMemory') : t('saved')} · ${display.timestamp(editor.savedAt)}`
                  : t('notSavedYet')}
              </p>
              <div className="flex flex-wrap gap-3">
                <DraftButton
                  secondary
                  disabled={editor.busy || !editor.dirty}
                  onClick={() => void editor.saveInput()}
                >
                  {editor.save.isPending ? t('saving') : t('saveInput')}
                </DraftButton>
                <DraftButton type="submit" disabled={editor.busy}>
                  {t('reviewConfirm')}
                </DraftButton>
              </div>
            </div>
          </form>
          {editor.save.isError && (
            <div className="mt-5">
              <DraftError error={editor.save.error} />
            </div>
          )}
          {conflict && (
            <div className="mt-4 space-y-3">
              <p className="text-fg-muted text-sm">
                {t(
                  'yourLocalValuesHaveBeenKeptLoadTheSavedRevisionToCompareBeforeChoosingToSaveThem'
                )}
              </p>
              <DraftButton
                secondary
                disabled={editor.busy}
                onClick={() => void editor.compareSaved()}
              >
                {t('compareWithSavedRevision')}
              </DraftButton>
            </div>
          )}
          {editor.reload.isError && <DraftError error={editor.reload.error} />}
          {editor.remote && (
            <div className="border-border mt-5 border-t pt-5">
              <h2 className="text-h2">
                {t('savedRevision')}
                {editor.remote.revision}
              </h2>
              <InputSummary
                input={editor.remote.input}
                fields={template.fields}
              />
              <DraftButton secondary onClick={editor.keepLocalAgainstRemote}>
                {t('keepMyInputAndUseThisRevisionForTheNextSave')}
              </DraftButton>
            </div>
          )}
        </Paper>
        <aside className="space-y-5 lg:sticky lg:top-6">
          <Paper>
            <h2 className="text-h2">{t('inputVersions')}</h2>
            <p className="text-fg-muted mt-3 text-sm">
              {t(
                'snapshotsAreImmutableSavingWorkingInputDoesNotConfirmASnapshotOrChangeAnExistingDraft'
              )}
            </p>
            <ul className="mt-5 space-y-3">
              {workspace.snapshots.map((snapshot) => (
                <li key={snapshot.id}>
                  <button
                    onClick={() => setSelected(snapshot)}
                    className="text-accent-text min-h-11 text-left underline-offset-4 hover:underline"
                  >
                    {t('snapshotConfirmed', {
                      version: display.number(snapshot.version),
                    })}
                  </button>
                  <p className="text-caption text-fg-muted">
                    {display.timestamp(snapshot.confirmedAt)}
                  </p>
                </li>
              ))}
            </ul>
            {!workspace.snapshots.length && (
              <p className="text-caption text-fg-muted mt-5">
                {t('noConfirmedSnapshotsYet')}
              </p>
            )}
            <DraftLink to={`/drafts/${workspace.id}/history`}>
              {t('draftHistory')}
            </DraftLink>
          </Paper>
          <p className="text-caption text-fg-muted px-1">
            {t(
              'amountsAreUserprovidedInputThisFormDoesNotCalculateTaxOrDetermineDeductibility'
            )}
          </p>
        </aside>
      </div>
      {selected && (
        <SnapshotDetails
          snapshot={selected}
          fields={template.fields}
          onClose={() => setSelected(null)}
        />
      )}
      {editor.dialog && (
        <Modal
          title={
            editor.confirmed
              ? t('confirmedTime', {
                  version: display.number(editor.confirmed.version),
                  time: display.timestamp(editor.confirmed.confirmedAt),
                })
              : t('confirmYourInputSnapshot')
          }
          closeLabel={t('backToInput')}
          preventClose={editor.confirm.isPending}
          onClose={() => editor.setDialog(false)}
          description={t(
            'confirmationCreatesAnImmutableInputVersionCheckEveryValueBeforeContinuing'
          )}
          footer={
            <>
              <DraftButton
                secondary
                disabled={editor.confirm.isPending}
                onClick={() => editor.setDialog(false)}
              >
                {t('backToInput')}
              </DraftButton>
              <DraftButton
                disabled={editor.confirm.isPending || !editor.acknowledged}
                onClick={() =>
                  editor.confirm.mutate(undefined, {
                    onSuccess: (job) => {
                      editor.guard.allowNavigation.current = true
                      navigate(
                        href(`/drafts/${workspace.id}/generations/${job.id}`)
                      )
                    },
                  })
                }
              >
                {editor.confirm.isPending
                  ? t('confirmingStarting')
                  : editor.confirmed
                    ? t('retryGenerationWithThisSnapshot')
                    : t('confirmGenerate')}
              </DraftButton>
            </>
          }
        >
          <InputSummary
            input={editor.confirmed?.input ?? editor.input}
            fields={template.fields}
          />
          <label className="rounded-control bg-sunken mt-5 flex items-start gap-3 p-4 text-sm">
            <input
              type="checkbox"
              className="accent-accent mt-1 size-5 shrink-0"
              checked={editor.acknowledged}
              disabled={editor.confirm.isPending}
              onChange={(event) => editor.setAcknowledged(event.target.checked)}
            />
            <span>
              {t(
                'iHaveCheckedThisInputItRepresentsTheDataIAmProvidingNotProfessionalVerification'
              )}
            </span>
          </label>
          {editor.confirm.isError && (
            <div className="mt-4">
              <DraftError error={editor.confirm.error} />
              {editor.confirmed && (
                <p className="mt-3 text-sm">
                  {t(
                    'theConfirmedSnapshotIsPreservedRetryDoesNotCreateAnotherSnapshot'
                  )}
                </p>
              )}
            </div>
          )}
        </Modal>
      )}
      {editor.guard.blocker.state === 'blocked' && (
        <Modal
          title={t('leaveUnsavedInput')}
          closeLabel={t('keepEditing')}
          onClose={() => editor.guard.blocker.reset?.()}
          description={t(
            'yourLatestChangesHaveNotBeenSavedLeaveToDiscardThemOrKeepEditingAndSaveFirst'
          )}
          footer={
            <>
              <DraftButton
                secondary
                onClick={() => editor.guard.blocker.reset?.()}
              >
                {t('keepEditing')}
              </DraftButton>
              <DraftButton onClick={() => editor.guard.blocker.proceed?.()}>
                {t('leavePage')}
              </DraftButton>
            </>
          }
        />
      )}
    </>
  )
}
export default function DraftInputPage() {
  const { t } = useTranslation('drafting')

  const { workspaceId } = useParams()
  const [params] = useSearchParams()
  const workspace = useWorkspace(workspaceId)
  const template = useTemplate(workspace.data?.templateVersionId)
  const fromVersion = params.get('fromVersion') ?? undefined
  const version = useDraftVersion(fromVersion)
  if (
    workspace.isPending ||
    (workspace.data && template.isPending) ||
    (fromVersion && version.isPending)
  )
    return <DraftLoading message={t('loadingWorkingInput')} />
  if (workspace.isError || template.isError || (fromVersion && version.isError))
    return (
      <DraftError
        error={workspace.error ?? template.error ?? version.error}
        retry={() => {
          void workspace.refetch()
          void template.refetch()
          if (fromVersion) void version.refetch()
        }}
      />
    )
  if (!workspace.data || !template.data || !template.data.fields.length)
    return (
      <DraftError
        error={new DraftUiError('workspaceOrInputSchemaUnavailable')}
      />
    )
  const sourceId = params.get('fromSnapshot') ?? version.data?.snapshotId
  const source = sourceId
    ? workspace.data.snapshots.find((snapshot) => snapshot.id === sourceId)
    : undefined
  if (
    (sourceId && !source) ||
    (fromVersion && version.data?.workspaceId !== workspaceId)
  )
    return (
      <DraftError
        error={
          new DraftUiError('theRevisionSourceDoesNotBelongToThisWorkspace', 404)
        }
      />
    )
  return (
    <InputEditor
      key={`${workspaceId}:${sourceId ?? 'working'}`}
      workspace={workspace.data}
      template={template.data}
      source={source}
      fromVersion={fromVersion}
    />
  )
}
