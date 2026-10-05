import { useRef, useState } from 'react'
import { Modal } from '@/components/ui/feedback/modal'
import { draftApi, draftCapabilities } from '../api/draftApi'
import { useDraftAction } from '../hooks/useDrafting'
import { DraftButton, DraftError, ReadinessBadge } from './DraftUi'
import type { DraftVersion, ReviewReceipt } from '../types'

export function ReviewHandoffSummary({
  draft,
  open,
  onClose,
}: {
  draft: DraftVersion
  open: boolean
  onClose: () => void
}) {
  const key = useRef(crypto.randomUUID())
  const [receipt, setReceipt] = useState<ReviewReceipt | null>(null)
  const mutation = useDraftAction(async (_: void, ctx) => {
    const result = await draftApi.review(draft.id, key.current, ctx)
    if (result.draftVersionId !== draft.id)
      throw new Error(
        'The handoff receipt does not match the selected draft version.'
      )
    return result
  })
  if (!open) return null
  return (
    <Modal
      title="Review handoff summary"
      closeLabel="Close review summary"
      description="The selected version and its references will be handed over together. A newer draft does not replace this package."
      preventClose={mutation.isPending}
      onClose={onClose}
      footer={
        <>
          <DraftButton
            secondary
            disabled={mutation.isPending}
            onClick={onClose}
          >
            Close
          </DraftButton>
          {!receipt && (
            <DraftButton
              disabled={
                mutation.isPending ||
                !draft.actions.review.allowed ||
                draft.assessment.status !== 'COMPLETED' ||
                !draftCapabilities.review
              }
              onClick={() =>
                mutation.mutate(undefined, { onSuccess: setReceipt })
              }
            >
              {mutation.isPending
                ? 'Preparing handoff…'
                : 'Confirm demo handoff'}
            </DraftButton>
          )}
        </>
      }
    >
      <dl className="mt-5 space-y-4 text-sm break-words">
        <div>
          <dt className="font-semibold">Draft</dt>
          <dd>
            Version {draft.version} · {draft.id}
          </dd>
        </div>
        <div>
          <dt className="font-semibold">Confirmed snapshot</dt>
          <dd>{draft.snapshotId}</dd>
        </div>
        <div>
          <dt className="font-semibold">Template version</dt>
          <dd>{draft.templateVersionId}</dd>
        </div>
        <div>
          <dt className="font-semibold">Sources and knowledge versions</dt>
          <dd>
            {draft.citations.length
              ? draft.citations.map((citation) => (
                  <p key={citation.id}>
                    {citation.sourceVersion} · {citation.knowledgeVersion}
                  </p>
                ))
              : 'No source references available'}
          </dd>
        </div>
        <div>
          <dt className="mb-2 font-semibold">Readiness</dt>
          <dd>
            <ReadinessBadge assessment={draft.assessment} />
          </dd>
        </div>
      </dl>
      <p className="rounded-control bg-sunken mt-5 p-4 text-sm">
        This boundary does not book an expert, send notifications or take
        payment. No supporting documents are required by the current demo
        schema.
      </p>
      {!draftCapabilities.review && (
        <p className="text-fg-muted mt-4 text-sm">
          Expert review integration has not been connected. This package cannot
          be submitted yet.
        </p>
      )}
      {!draft.actions.review.allowed && (
        <p className="text-danger mt-4 text-sm">
          {draft.actions.review.reason}
        </p>
      )}
      {mutation.isError && (
        <div className="mt-4">
          <DraftError error={mutation.error} />
        </div>
      )}
      {receipt && (
        <p
          role="status"
          className="rounded-control bg-success-soft text-success mt-4 p-4 text-sm"
        >
          {receipt.message}
        </p>
      )}
    </Modal>
  )
}
