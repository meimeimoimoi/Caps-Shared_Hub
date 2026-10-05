import { Modal } from '@/components/ui/feedback/modal'
import { DraftButton, DraftLink } from './DraftUi'
import { formatField, timestamp } from '../utils/validation'
import type { SchemaField, Snapshot } from '../types'
import { useHistory } from '../hooks/useDrafting'

export function InputSummary({
  input,
  fields,
}: {
  input: Record<string, string>
  fields: SchemaField[]
}) {
  return (
    <dl className="divide-border mt-4 divide-y">
      {fields.map((field) => (
        <div key={field.id} className="py-3">
          <dt className="text-caption text-fg-muted font-semibold">
            {field.label}
            {field.required ? ' · Required' : ''}
          </dt>
          <dd className="mt-1 text-sm break-words whitespace-pre-wrap tabular-nums">
            {formatField(input[field.id], field)}
          </dd>
        </div>
      ))}
    </dl>
  )
}
export function SnapshotDetails({
  snapshot,
  fields,
  onClose,
}: {
  snapshot: Snapshot
  fields: SchemaField[]
  onClose: () => void
}) {
  const history = useHistory(snapshot.workspaceId)
  return (
    <Modal
      title={`Confirmed Snapshot v${snapshot.version}`}
      closeLabel="Close snapshot details"
      description={`Immutable · ${timestamp(snapshot.confirmedAt)} · Template ${snapshot.templateVersionId}`}
      onClose={onClose}
      footer={
        <>
          <DraftLink
            to={`/drafts/${snapshot.workspaceId}/input?fromSnapshot=${snapshot.id}`}
          >
            Revise this snapshot
          </DraftLink>
          <DraftButton secondary onClick={onClose}>
            Close
          </DraftButton>
        </>
      }
    >
      <InputSummary input={snapshot.input} fields={fields} />
      <h3 className="mt-5 font-semibold">Drafts from this snapshot</h3>
      {history.isPending ? (
        <p role="status" className="mt-2 text-sm">
          Loading related drafts…
        </p>
      ) : history.isError ? (
        <p role="alert" className="text-danger mt-2 text-sm">
          Related draft history could not be loaded.
        </p>
      ) : (
        <ul>
          {history.data
            ?.filter((draft) => draft.snapshotId === snapshot.id)
            .map((draft) => (
              <li key={draft.id}>
                <DraftLink
                  to={`/drafts/${snapshot.workspaceId}/versions/${draft.id}`}
                >
                  Draft v{draft.version}
                </DraftLink>
              </li>
            ))}
        </ul>
      )}
    </Modal>
  )
}
