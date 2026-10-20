import { useDraftPresentation } from '@/features/drafting/hooks/useDraftPresentation'
import { useTranslation } from 'react-i18next'
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

export default function DraftListPage() {
  const display = useDraftPresentation()

  const { t } = useTranslation('drafting')

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
        title={t('yourDraftWorkspaces')}
        description={t(
          'continueASavedInputFollowAGenerationJobOrReturnToAnExactDraftVersion'
        )}
      >
        <DraftLink primary to="/drafts/templates">
          <FilePlus2 size={18} className="mr-2" />
          {t('newDraft')}
        </DraftLink>
      </DraftHeading>
      {query.isPending ? (
        <DraftLoading />
      ) : query.isError ? (
        <DraftError error={query.error} retry={() => void query.refetch()} />
      ) : !query.data?.length ? (
        <Paper>
          <h2 className="text-h2">{t('startWithATemplate')}</h2>
          <p className="text-fg-muted my-3">
            {t('yourSavedInputsAndDraftVersionsWillAppearHere')}
          </p>
          <DraftLink primary to="/drafts/templates">
            {t('browseTemplates')}
          </DraftLink>
        </Paper>
      ) : (
        <>
          <label className="mb-5 block max-w-md text-sm font-medium">
            {t('findAWorkspace')}
            <input
              type="search"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value)
                setPage(1)
              }}
              className="rounded-control border-border-control bg-paper text-fg mt-2 min-h-11 w-full border px-3"
              placeholder={t('searchByDocumentTitle')}
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
                    {t('listRevision', {
                      revision: display.number(workspace.revision),
                      total: display.number(workspace.snapshots.length),
                    })}
                  </p>
                  <p className="text-caption text-fg-muted">
                    {t('savedTime', {
                      time: display.timestamp(workspace.savedAt),
                    })}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-4">
                  <DraftLink to={`/drafts/${workspace.id}/input`}>
                    {t('workingInput')}
                    <ArrowRight size={16} />
                  </DraftLink>
                  {workspace.latestJobId && (
                    <DraftLink
                      to={`/drafts/${workspace.id}/generations/${workspace.latestJobId}`}
                    >
                      {t('generation')}
                    </DraftLink>
                  )}
                  {workspace.latestDraftId && (
                    <DraftLink
                      to={`/drafts/${workspace.id}/versions/${workspace.latestDraftId}`}
                    >
                      {t('preview')}
                    </DraftLink>
                  )}
                  <DraftLink to={`/drafts/${workspace.id}/history`}>
                    {t('history')}
                  </DraftLink>
                </div>
              </article>
            ))}
            {!rows.length && (
              <p className="text-fg-muted p-6">
                {t('noWorkspacesMatchYourSearch')}
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
