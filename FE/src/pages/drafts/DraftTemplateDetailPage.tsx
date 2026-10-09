import { useDraftPresentation } from '@/features/drafting/hooks/useDraftPresentation'
import { useTranslation } from 'react-i18next'
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

export default function DraftTemplateDetailPage() {
  const display = useDraftPresentation()

  const { t } = useTranslation('drafting')

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
    return <DraftLoading message={t('loadingInputRequirements')} />
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
                ? t('unavailable')
                : template.fields.length
                  ? t('availableForDrafting')
                  : t('referenceOnly')}
            </span>
            <span className="rounded-control bg-sunken px-3 py-1">
              {t('templateVersionNumber', {
                version: display.number(template.version),
              })}
            </span>
            <span
              className={
                template.status === 'ACTIVE' ? 'text-success' : 'text-danger'
              }
            >
              {display.templateStatus(template.status)}
            </span>
            <span className="text-fg-muted">
              {t('updatedTime', {
                time: display.timestamp(template.updatedAt),
              })}
            </span>
          </div>
          <h2 className="text-h2">{t('inputRequirements')}</h2>
          {template.fields.length > 0 && (
            <p className="text-fg-muted mt-2">
              {t('requirementsCount', {
                required: display.number(
                  template.fields.filter((field) => field.required).length
                ),
                optional: display.number(
                  template.fields.filter((field) => !field.required).length
                ),
              })}
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
                            {display.fieldType(field.type)} ·{' '}
                            {field.required ? t('required') : t('optional')}
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
              {t(
                'thisTemplateIsAvailableForReferenceItsInputFormIsNotAvailableYetSoItCannotCreateADraftingWorkspace'
              )}
            </p>
          )}
        </Paper>
        <aside className="space-y-5 lg:sticky lg:top-6">
          <Paper>
            <h2 className="text-h2">{t('versionNotes')}</h2>
            {template.changelog ? (
              <ul className="text-fg-muted mt-3 list-disc space-y-2 pl-4 text-sm">
                {template.changelog.map((note) => (
                  <li key={note}>{note}</li>
                ))}
              </ul>
            ) : (
              <p className="text-fg-muted mt-3 text-sm">
                {t('noChangelogWasSuppliedForThisVersion')}
              </p>
            )}
            <p className="text-caption text-fg-muted mt-5">
              {t('newTemplateVersionsDoNotChangeAnExistingWorkspace')}
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
            {create.isPending ? t('creatingWorkspace') : t('useThisTemplate')}
          </DraftButton>
          {create.isError && <DraftError error={create.error} />}
          <DraftLink
            to={`/drafts/templates?category=${encodeURIComponent(params.get('category') ?? 'All')}`}
          >
            {t('chooseAnotherTemplate')}
          </DraftLink>
        </aside>
      </div>
    </>
  )
}
