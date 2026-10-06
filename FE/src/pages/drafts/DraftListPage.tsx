import { useState } from 'react'
import { FilePlus2, ArrowRight } from 'lucide-react'
import { Pagination } from '@/components/ui/navigation/pagination'
import { useWorkspaces } from '@/features/drafting/hooks/useDrafting'
import {
  DraftHeading,
  DraftLink,
  DraftLoading,
  DraftError,
  Paper,
} from '@/features/drafting/components/DraftUi'
import { timestamp } from '@/features/drafting/utils/validation'

export default function DraftListPage() {
  const query = useWorkspaces()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const rows = (query.data ?? []).filter((value) =>
    value.title.toLocaleLowerCase().includes(search.toLocaleLowerCase())
  )
  const current = Math.min(page, Math.max(1, Math.ceil(rows.length / 8)))
  return (
    <>
      <DraftHeading
        title="Your draft workspaces"
        description="Continue a saved input, follow a generation job or return to an exact draft version."
      >
        <DraftLink primary to="/drafts/templates">
          <FilePlus2 size={18} className="mr-2" />
          New draft
        </DraftLink>
      </DraftHeading>
      {query.isPending ? (
        <DraftLoading />
      ) : query.isError ? (
        <DraftError error={query.error} retry={() => void query.refetch()} />
      ) : !query.data?.length ? (
        <Paper>
          <h2 className="text-h2">Start with a template</h2>
          <p className="text-fg-muted my-3">
            Your saved inputs and draft versions will appear here.
          </p>
          <DraftLink primary to="/drafts/templates">
            Browse templates
          </DraftLink>
        </Paper>
      ) : (
        <>
          <label className="mb-5 block max-w-md text-sm font-medium">
            Find a workspace
            <input
              type="search"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value)
                setPage(1)
              }}
              className="rounded-control border-border-control bg-paper text-fg mt-2 min-h-11 w-full border px-3"
              placeholder="Search by document title"
            />
          </label>
          <div className="divide-border rounded-surface border-border bg-paper divide-y border">
            {rows.slice((current - 1) * 8, current * 8).map((workspace) => (
              <article
                key={workspace.id}
                className="flex flex-wrap items-center justify-between gap-4 p-5 md:p-6"
              >
                <div className="max-w-2xl min-w-0">
                  <h2 className="text-h2 break-words">{workspace.title}</h2>
                  <p className="text-caption text-fg-muted mt-2">
                    Working input revision {workspace.revision} ·{' '}
                    {workspace.snapshots.length} confirmed snapshot(s)
                  </p>
                  <p className="text-caption text-fg-muted">
                    Saved {timestamp(workspace.savedAt)}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-4">
                  <DraftLink to={`/drafts/${workspace.id}/input`}>
                    Working input <ArrowRight size={16} />
                  </DraftLink>
                  {workspace.latestJobId && (
                    <DraftLink
                      to={`/drafts/${workspace.id}/generations/${workspace.latestJobId}`}
                    >
                      Generation
                    </DraftLink>
                  )}
                  {workspace.latestDraftId && (
                    <DraftLink
                      to={`/drafts/${workspace.id}/versions/${workspace.latestDraftId}`}
                    >
                      Preview
                    </DraftLink>
                  )}
                  <DraftLink to={`/drafts/${workspace.id}/history`}>
                    History
                  </DraftLink>
                </div>
              </article>
            ))}
            {!rows.length && (
              <p className="text-fg-muted p-6">
                No workspaces match your search.
              </p>
            )}
          </div>
          <Pagination
            page={current}
            pageSize={8}
            total={rows.length}
            onPageChange={setPage}
          />
        </>
      )}
    </>
  )
}
