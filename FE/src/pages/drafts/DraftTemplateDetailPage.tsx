import { useRef } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { draftApi } from '@/features/drafting/api/draftApi'
import {
  useDraftAction,
  useDraftHref,
  useTemplate,
} from '@/features/drafting/hooks/useDrafting'
import {
  DraftHeading,
  DraftLink,
  DraftLoading,
  DraftError,
  DraftButton,
  Paper,
} from '@/features/drafting/components/DraftUi'
import { timestamp } from '@/features/drafting/utils/validation'

export default function DraftTemplateDetailPage() {
  const { templateVersionId } = useParams()
  const query = useTemplate(templateVersionId)
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const href = useDraftHref()
  const key = useRef(crypto.randomUUID())
  const create = useDraftAction((_: void, ctx) =>
    draftApi.create(templateVersionId!, key.current, ctx)
  )
  if (query.isPending)
    return <DraftLoading message="Loading input requirements…" />
  if (query.isError || !query.data)
    return <DraftError error={query.error} retry={() => void query.refetch()} />
  const template = query.data
  return (
    <>
      <DraftHeading
        title={template.title}
        description={template.description}
        step={0}
      />
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <Paper>
          <div className="mb-6 flex flex-wrap gap-3 text-sm">
            <span
              className={`rounded-control px-3 py-1 ${template.status !== 'ACTIVE' ? 'bg-danger-soft text-danger' : template.fields.length ? 'bg-success-soft text-success' : 'bg-sunken text-fg-muted'}`}
            >
              {template.status !== 'ACTIVE'
                ? 'Unavailable'
                : template.fields.length
                  ? 'Available for drafting'
                  : 'Reference only'}
            </span>
            <span className="rounded-control bg-sunken px-3 py-1">
              Template v{template.version}
            </span>
            <span
              className={
                template.status === 'ACTIVE' ? 'text-success' : 'text-danger'
              }
            >
              {template.status}
            </span>
            <span className="text-fg-muted">
              Updated {timestamp(template.updatedAt)}
            </span>
          </div>
          <h2 className="text-h2">Input requirements</h2>
          {template.fields.length > 0 && (
            <p className="text-fg-muted mt-2">
              {template.fields.filter((field) => field.required).length}{' '}
              required ·{' '}
              {template.fields.filter((field) => !field.required).length}{' '}
              optional
            </p>
          )}
          {template.schemaNote && (
            <p className="rounded-control bg-warning-soft text-warning mt-4 p-4 text-sm">
              {template.schemaNote}
            </p>
          )}
          <div className="mt-6 space-y-6">
            {[...new Set(template.fields.map((field) => field.group))].map(
              (group) => (
                <section key={group}>
                  <h3 className="text-fg-strong font-semibold">{group}</h3>
                  <ul className="divide-border mt-2 divide-y">
                    {template.fields
                      .filter((field) => field.group === group)
                      .map((field) => (
                        <li
                          key={field.id}
                          className="flex flex-wrap justify-between gap-3 py-3 text-sm"
                        >
                          <span>{field.label}</span>
                          <span className="text-fg-muted">
                            {field.type} ·{' '}
                            {field.required ? 'Required' : 'Optional'}
                          </span>
                        </li>
                      ))}
                  </ul>
                </section>
              )
            )}
          </div>
          {!template.fields.length && (
            <p className="text-fg-muted mt-4">
              This template is available for reference. Its input form is not
              available yet, so it cannot create a drafting workspace.
            </p>
          )}
        </Paper>
        <aside className="space-y-5 lg:sticky lg:top-6">
          <Paper>
            <h2 className="text-h2">Version notes</h2>
            {template.changelog ? (
              <ul className="text-fg-muted mt-3 list-disc space-y-2 pl-4 text-sm">
                {template.changelog.map((note) => (
                  <li key={note}>{note}</li>
                ))}
              </ul>
            ) : (
              <p className="text-fg-muted mt-3 text-sm">
                No changelog was supplied for this version.
              </p>
            )}
            <p className="text-caption text-fg-muted mt-5">
              New template versions do not change an existing workspace.
            </p>
          </Paper>
          <DraftButton
            className="w-full"
            disabled={
              create.isPending ||
              template.status !== 'ACTIVE' ||
              !template.fields.length
            }
            onClick={() =>
              create.mutate(undefined, {
                onSuccess: (workspace) =>
                  navigate(href(`/drafts/${workspace.id}/input`)),
              })
            }
          >
            {create.isPending ? 'Creating workspace…' : 'Use this template'}
          </DraftButton>
          {create.isError && <DraftError error={create.error} />}
          <DraftLink
            to={`/drafts/templates?category=${encodeURIComponent(params.get('category') ?? 'All')}`}
          >
            Choose another template
          </DraftLink>
        </aside>
      </div>
    </>
  )
}
