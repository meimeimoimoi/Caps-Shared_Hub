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
import { timestamp } from '@/features/drafting/utils/validation'
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
            ? `Revising Snapshot v${source.version}. Confirming these changes will create a new snapshot; previous drafts stay unchanged.`
            : 'Enter the facts and amounts for this document. Only confirmed input can be used to create a draft.'
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
          {source ? 'Cancel revision' : 'All workspaces'}
        </DraftLink>
      </DraftHeading>
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <Paper>
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3 text-sm">
            <p className="text-fg-muted">
              Template v{template.version} · Working input revision{' '}
              {editor.revision}
            </p>
            <span className="rounded-control bg-sunken px-3 py-1">
              {editor.dirty
                ? 'Unsaved changes'
                : 'Working input · Not confirmed'}
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
                Check the following fields before confirmation.
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
                  ? `${isDraftMock ? 'Saved in demo memory' : 'Saved'} · ${timestamp(editor.savedAt)}`
                  : 'Not saved yet'}
              </p>
              <div className="flex flex-wrap gap-3">
                <DraftButton
                  secondary
                  disabled={editor.busy || !editor.dirty}
                  onClick={() => void editor.saveInput()}
                >
                  {editor.save.isPending ? 'Saving…' : 'Save input'}
                </DraftButton>
                <DraftButton type="submit" disabled={editor.busy}>
                  Review & confirm
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
                Your local values have been kept. Load the saved revision to
                compare before choosing to save them.
              </p>
              <DraftButton
                secondary
                disabled={editor.busy}
                onClick={() => void editor.compareSaved()}
              >
                Compare with saved revision
              </DraftButton>
            </div>
          )}
          {editor.reload.isError && <DraftError error={editor.reload.error} />}
          {editor.remote && (
            <div className="border-border mt-5 border-t pt-5">
              <h2 className="text-h2">
                Saved revision {editor.remote.revision}
              </h2>
              <InputSummary
                input={editor.remote.input}
                fields={template.fields}
              />
              <DraftButton secondary onClick={editor.keepLocalAgainstRemote}>
                Keep my input and use this revision for the next save
              </DraftButton>
            </div>
          )}
        </Paper>
        <aside className="space-y-5 lg:sticky lg:top-6">
          <Paper>
            <h2 className="text-h2">Input versions</h2>
            <p className="text-fg-muted mt-3 text-sm">
              Snapshots are immutable. Saving Working Input does not confirm a
              snapshot or change an existing draft.
            </p>
            <ul className="mt-5 space-y-3">
              {workspace.snapshots.map((snapshot) => (
                <li key={snapshot.id}>
                  <button
                    onClick={() => setSelected(snapshot)}
                    className="text-accent-text min-h-11 text-left underline-offset-4 hover:underline"
                  >
                    Snapshot v{snapshot.version} · Confirmed
                  </button>
                  <p className="text-caption text-fg-muted">
                    {timestamp(snapshot.confirmedAt)}
                  </p>
                </li>
              ))}
            </ul>
            {!workspace.snapshots.length && (
              <p className="text-caption text-fg-muted mt-5">
                No confirmed snapshots yet.
              </p>
            )}
            <DraftLink to={`/drafts/${workspace.id}/history`}>
              Draft history
            </DraftLink>
          </Paper>
          <p className="text-caption text-fg-muted px-1">
            Amounts are user-provided input. This form does not calculate tax or
            determine deductibility.
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
              ? `Snapshot v${editor.confirmed.version} confirmed`
              : 'Confirm your input snapshot'
          }
          closeLabel="Back to input"
          preventClose={editor.confirm.isPending}
          onClose={() => editor.setDialog(false)}
          description="Confirmation creates an immutable input version. Check every value before continuing."
          footer={
            <>
              <DraftButton
                secondary
                disabled={editor.confirm.isPending}
                onClick={() => editor.setDialog(false)}
              >
                Back to input
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
                  ? 'Confirming & starting…'
                  : editor.confirmed
                    ? 'Retry generation with this snapshot'
                    : 'Confirm & generate'}
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
              I have checked this input. It represents the data I am providing,
              not professional verification.
            </span>
          </label>
          {editor.confirm.isError && (
            <div className="mt-4">
              <DraftError error={editor.confirm.error} />
              {editor.confirmed && (
                <p className="mt-3 text-sm">
                  The confirmed snapshot is preserved. Retry does not create
                  another snapshot.
                </p>
              )}
            </div>
          )}
        </Modal>
      )}
      {editor.guard.blocker.state === 'blocked' && (
        <Modal
          title="Leave unsaved input?"
          closeLabel="Keep editing"
          onClose={() => editor.guard.blocker.reset?.()}
          description="Your latest changes have not been saved. Leave to discard them, or keep editing and save first."
          footer={
            <>
              <DraftButton
                secondary
                onClick={() => editor.guard.blocker.reset?.()}
              >
                Keep editing
              </DraftButton>
              <DraftButton onClick={() => editor.guard.blocker.proceed?.()}>
                Leave page
              </DraftButton>
            </>
          }
        />
      )}
    </>
  )
}
export default function DraftInputPage() {
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
    return <DraftLoading message="Loading working input…" />
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
      <DraftError error={new Error('Workspace or input schema unavailable.')} />
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
          new ApiError(
            'The revision source does not belong to this workspace.',
            404
          )
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
