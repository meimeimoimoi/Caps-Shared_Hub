import { useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { Pagination } from '@/components/ui/navigation/pagination'
import { useHistory, useWorkspace } from '@/features/drafting/hooks/useDrafting'
import {
  DraftHeading,
  DraftLink,
  DraftLoading,
  DraftError,
  Paper,
  ReadinessBadge,
} from '@/features/drafting/components/DraftUi'
import { timestamp } from '@/features/drafting/utils/validation'

export default function DraftHistoryPage() {
  const { workspaceId } = useParams()
  const [params] = useSearchParams()
  const query = useHistory(workspaceId)
  const workspace = useWorkspace(workspaceId)
  const [page, setPage] = useState(1)
  const current = Math.min(
    page,
    Math.max(1, Math.ceil((query.data?.length ?? 0) / 6))
  )
  return (
    <>
      <DraftHeading
        title="Draft version history"
        description={
          workspace.data?.title ??
          'Each version retains its original snapshot, template and source references.'
        }
      >
        <DraftLink to={`/drafts/${workspaceId}/input`}>Working input</DraftLink>
      </DraftHeading>
      {query.isPending ? (
        <DraftLoading message="Loading version history…" />
      ) : query.isError ? (
        <DraftError error={query.error} retry={() => void query.refetch()} />
      ) : !query.data?.length ? (
        <Paper>
          <h2 className="text-h2">No draft versions yet</h2>
          <p className="text-fg-muted mt-3">
            A confirmed snapshot can exist before generation succeeds.
          </p>
          <DraftLink to={`/drafts/${workspaceId}/input`}>
            Continue working input
          </DraftLink>
          {workspace.data?.latestJobId && (
            <DraftLink
              className="ml-4"
              to={`/drafts/${workspaceId}/generations/${workspace.data.latestJobId}`}
            >
              Check generation
            </DraftLink>
          )}
        </Paper>
      ) : (
        <>
          <ol className="space-y-4">
            {query.data.slice((current - 1) * 6, current * 6).map((draft) => (
              <li
                key={draft.id}
                className={`rounded-surface bg-paper shadow-paper border p-5 md:p-6 ${params.get('selected') === draft.id ? 'border-accent' : 'border-border'}`}
              >
                <div className="flex flex-wrap justify-between gap-4">
                  <div className="min-w-0">
                    <h2 className="text-h2">
                      Draft v{draft.version}
                      {params.get('selected') === draft.id && (
                        <span className="text-caption text-accent-text ml-3 font-sans">
                          Selected
                        </span>
                      )}
                    </h2>
                    <p className="text-fg-muted mt-2 text-sm">
                      Snapshot v
                      {workspace.data?.snapshots.find(
                        (snapshot) => snapshot.id === draft.snapshotId
                      )?.version ?? '?'}{' '}
                      · {draft.templateVersionId}
                    </p>
                    <p className="text-caption text-fg-muted mt-1">
                      {timestamp(draft.generatedAt)}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-4">
                    <ReadinessBadge assessment={draft.assessment} />
                    <DraftLink
                      to={`/drafts/${workspaceId}/versions/${draft.id}`}
                    >
                      Open this version
                    </DraftLink>
                  </div>
                </div>
                {draft.exportEvents.length > 0 && (
                  <ul className="border-border text-caption text-fg-muted mt-4 border-t pt-3">
                    {draft.exportEvents.map((event) => (
                      <li
                        key={event.id}
                        className="flex flex-wrap items-center justify-between gap-2"
                      >
                        Artifact created · {event.format.toUpperCase()} ·{' '}
                        {timestamp(event.createdAt)}
                        <DraftLink
                          to={`/drafts/${workspaceId}/versions/${draft.id}?exportId=${event.id}`}
                        >
                          Retrieve artifact
                        </DraftLink>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ol>
          <Pagination
            page={current}
            pageSize={6}
            total={query.data.length}
            onPageChange={setPage}
          />
        </>
      )}
    </>
  )
}
