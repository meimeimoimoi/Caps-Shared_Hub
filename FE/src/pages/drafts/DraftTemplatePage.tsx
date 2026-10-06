import { useSearchParams } from 'react-router-dom'
import { FileText, ArrowUpRight, MessageSquare } from 'lucide-react'
import {
  useDraftContext,
  useTemplates,
} from '@/features/drafting/hooks/useDrafting'
import {
  DraftHeading,
  DraftLink,
  DraftLoading,
  DraftError,
} from '@/features/drafting/components/DraftUi'
import { isDraftMock } from '@/features/drafting/api/dataSource'

export default function DraftTemplatePage() {
  const query = useTemplates()
  const ctx = useDraftContext()
  const [params, setParams] = useSearchParams()
  const category = params.get('category') ?? 'All'
  const categories = [
    'All',
    'Explanation',
    'Finalization',
    'Refund',
    'Incentive',
  ]
  return (
    <>
      <DraftHeading
        title="Choose a document template"
        description="Start with a versioned template. Your confirmed input will be kept separate from the AI draft."
        step={0}
      />
      {isDraftMock && ctx.scenario === 'chat-suggestion' && (
        <div className="rounded-control border-border bg-paper mb-6 flex items-start gap-3 border p-5">
          <MessageSquare className="text-accent mt-1 shrink-0" size={20} />
          <div>
            <h2 className="text-h2">
              A suggestion from your demo conversation
            </h2>
            <p className="text-fg-muted mt-2">
              The expense explanation template matches the synthetic
              conversation. Choosing it imports editable suggestions into
              Working Input; nothing is confirmed automatically.
            </p>
          </div>
        </div>
      )}
      <div className="mb-6 flex flex-wrap gap-2" aria-label="Template category">
        {categories.map((value) => (
          <button
            key={value}
            aria-pressed={category === value}
            className={`rounded-control min-h-11 border px-4 py-2 text-sm ${category === value ? 'border-selected bg-selected text-on-selected' : 'border-border bg-paper text-fg hover:border-border-control'}`}
            onClick={() => {
              const next = new URLSearchParams(params)
              next.set('category', value)
              setParams(next)
            }}
          >
            {value}
          </button>
        ))}
      </div>
      {query.isPending ? (
        <DraftLoading message="Loading template versions…" />
      ) : query.isError ? (
        <DraftError error={query.error} retry={() => void query.refetch()} />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {query.data
            ?.filter(
              (template) => category === 'All' || template.category === category
            )
            .map((template) => (
              <article
                key={template.id}
                className="rounded-surface border-border bg-paper shadow-paper flex min-w-0 flex-col border p-6"
              >
                <div className="mb-5 flex items-center justify-between">
                  <FileText size={25} className="text-accent" />
                  <span className="text-caption text-fg-muted">
                    v{template.version} · {template.category}
                  </span>
                </div>
                <div className="mb-3">
                  <span
                    className={`rounded-control text-caption inline-flex px-2.5 py-1 font-medium ${template.status !== 'ACTIVE' ? 'bg-danger-soft text-danger' : template.fields.length ? 'bg-success-soft text-success' : 'bg-sunken text-fg-muted'}`}
                  >
                    {template.status !== 'ACTIVE'
                      ? 'Unavailable'
                      : template.fields.length
                        ? 'Available for drafting'
                        : 'Reference only'}
                  </span>
                </div>
                <h2 className="text-h2">{template.title}</h2>
                <p className="text-fg-muted mt-3 flex-1 text-sm">
                  {template.description}
                </p>
                <p className="text-caption text-fg-muted mt-6">
                  {template.fields.length
                    ? `${template.fields.length} input fields`
                    : 'Input form not available'}{' '}
                  · Updated {template.updatedAt.slice(0, 10)}
                </p>
                <div className="border-border mt-4 border-t pt-2">
                  <DraftLink
                    to={`/drafts/templates/${template.id}?category=${encodeURIComponent(category)}`}
                  >
                    {template.fields.length
                      ? 'View template'
                      : 'View reference'}{' '}
                    <ArrowUpRight size={16} />
                  </DraftLink>
                  {template.status !== 'ACTIVE' && (
                    <p className="text-caption text-danger">
                      Inactive — unavailable for new workspaces
                    </p>
                  )}
                </div>
              </article>
            ))}
        </div>
      )}
      {query.data &&
        !query.data.filter(
          (template) => category === 'All' || template.category === category
        ).length && (
          <p className="text-fg-muted py-8">No templates in this category.</p>
        )}
    </>
  )
}
