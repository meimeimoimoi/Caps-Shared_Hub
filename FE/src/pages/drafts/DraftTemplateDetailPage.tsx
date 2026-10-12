import { useDraftPresentation } from '@/features/drafting/hooks/useDraftPresentation'
import { useTranslation } from 'react-i18next'
import { useRef } from 'react'
import { ArrowLeft, ArrowRight, Info } from 'lucide-react'
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
} from '@/features/drafting/components/DraftUi'
import { cn } from '@/lib/utils'

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
  const ready = template.status === 'ACTIVE' && template.fields.length > 0
  const required = template.fields.filter((field) => field.required).length
  const allRequired = required === template.fields.length
  const groups = [...new Set(template.fields.map((field) => field.group))]
  const stats = [
    { value: template.fields.length, label: t('statFields') },
    { value: groups.length, label: t('statGroups') },
    { value: required, label: t('statRequired') },
  ]
  const card = 'bg-surface border-border min-w-0 rounded-2xl border shadow-xs'
  const startDrafting = () =>
    create.mutate(undefined, {
      onSuccess: (workspace) => navigate(href(`/drafts/${workspace.id}/input`)),
    })
  const startButton = (className?: string) => (
    <DraftButton
      className={cn('group gap-2 rounded-xl', className)}
      disabled={create.isPending || !ready}
      onClick={startDrafting}
    >
      {create.isPending ? t('creatingWorkspace') : t('useThisTemplate')}
      {!create.isPending && (
        <ArrowRight
          size={16}
          aria-hidden="true"
          className="transition-transform duration-200 group-hover:translate-x-0.5"
        />
      )}
    </DraftButton>
  )

  return (
    <>
      <DraftHeading
        title={template.title}
        description={template.description}
        step={0}
      />
      <div className="grid max-w-5xl items-start gap-6 lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-8">
        {/* Chính: dữ liệu người dùng cần chuẩn bị */}
        <section
          aria-labelledby="prepare-title"
          className={cn(card, '@container')}
        >
          <header className="p-6 md:p-8">
            <h2
              id="prepare-title"
              className="text-text-strong font-serif text-2xl leading-tight"
            >
              {t('prepareDataTitle')}
            </h2>
            <p className="text-text-muted mt-2 max-w-[60ch] text-sm leading-relaxed">
              {ready
                ? t('prepareDataLead')
                : t(
                    'thisTemplateIsAvailableForReferenceItsInputFormIsNotAvailableYetSoItCannotCreateADraftingWorkspace'
                  )}
            </p>
            {template.fields.length > 0 && (
              <dl className="border-border-subtle mt-6 grid grid-cols-3 border-t pt-5">
                {stats.map((stat, index) => (
                  <div
                    key={stat.label}
                    className={cn(
                      'flex flex-col gap-1',
                      index > 0 && 'border-border-subtle border-l pl-4 md:pl-6'
                    )}
                  >
                    <dt className="text-text-muted order-2 text-xs leading-snug">
                      {stat.label}
                    </dt>
                    <dd className="text-text-strong font-num order-1 font-serif text-3xl leading-none">
                      {display.number(stat.value)}
                    </dd>
                  </div>
                ))}
              </dl>
            )}
          </header>

          {groups.length > 0 && (
            <ol className="border-border-subtle border-t">
              {groups.map((group, index) => {
                const fields = template.fields.filter(
                  (field) => field.group === group
                )
                return (
                  <li
                    key={group}
                    className="border-border-subtle grid gap-4 border-b px-6 py-6 last:border-b-0 md:px-8 @xl:grid-cols-[176px_minmax(0,1fr)] @xl:gap-8"
                  >
                    <div className="flex items-baseline gap-3 @xl:flex-col @xl:gap-1">
                      <span
                        aria-hidden="true"
                        className="text-accent-text font-num font-serif text-sm"
                      >
                        {String(index + 1).padStart(2, '0')}
                      </span>
                      <h3 className="text-text-strong text-base leading-snug font-semibold">
                        {group}
                      </h3>
                      <span className="text-text-muted ml-auto text-xs @xl:ml-0">
                        {t('fieldCount', { count: fields.length })}
                      </span>
                    </div>
                    <dl className="divide-border-subtle divide-y">
                      {fields.map((field) => (
                        <div
                          key={field.id}
                          className="flex items-start justify-between gap-4 py-3 first:pt-0 last:pb-0"
                        >
                          <dt className="min-w-0">
                            <span className="text-text-strong text-sm font-medium">
                              {field.label}
                            </span>
                            {!field.required && (
                              <span className="text-text-muted ml-2 text-xs">
                                {t('optional')}
                              </span>
                            )}
                            {field.hint && (
                              <span className="text-text-muted mt-1 block text-xs leading-relaxed">
                                {field.hint}
                              </span>
                            )}
                          </dt>
                          <dd className="text-text-muted shrink-0 pt-0.5 text-xs">
                            {display.fieldType(field.type)}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  </li>
                )
              })}
            </ol>
          )}

          {(template.schemaNote || (allRequired && required > 0)) && (
            <footer className="border-border-subtle bg-sunken/50 text-text-muted flex flex-col gap-2 rounded-b-2xl border-t px-6 py-4 text-xs leading-relaxed md:px-8">
              {allRequired && required > 0 && <p>{t('allFieldsRequired')}</p>}
              {template.schemaNote && (
                <p className="flex items-start gap-2">
                  <Info
                    size={14}
                    aria-hidden="true"
                    className="mt-0.5 shrink-0"
                  />
                  {template.schemaNote}
                </p>
              )}
            </footer>
          )}
        </section>

        {/* Phụ: hành động + phiên bản. Trên mobile nút chính nằm ở thanh dính đáy */}
        <aside className="lg:sticky lg:top-6">
          <section aria-labelledby="start-title" className={cn(card, 'p-6')}>
            <div className="flex items-center justify-between gap-3">
              <p className="text-text-muted text-xs font-semibold tracking-[0.06em] uppercase">
                {t('versionNumber', { n: template.version })}
              </p>
              <span
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium',
                  ready
                    ? 'bg-success-soft text-success'
                    : template.status === 'ACTIVE'
                      ? 'bg-sunken text-fg-muted'
                      : 'bg-danger-soft text-danger'
                )}
              >
                <span
                  aria-hidden="true"
                  className="size-1.5 rounded-full bg-current"
                />
                {template.status !== 'ACTIVE'
                  ? t('unavailable')
                  : ready
                    ? t('versionInUse')
                    : t('referenceOnly')}
              </span>
            </div>
            <h2
              id="start-title"
              className="text-text-strong mt-4 font-serif text-xl leading-snug"
            >
              {t('startDraftingTitle')}
            </h2>
            <p className="text-text-muted mt-2 text-sm leading-relaxed">
              {t('startDraftingLead')}
            </p>
            <div className="mt-5 hidden flex-col gap-2 lg:flex">
              {startButton('w-full')}
              {create.isError && <DraftError error={create.error} />}
              <DraftLink
                to={`/drafts/templates?category=${encodeURIComponent(params.get('category') ?? 'All')}`}
                className="text-text-muted hover:text-text-strong justify-center text-sm no-underline hover:no-underline"
              >
                <ArrowLeft size={14} aria-hidden="true" />
                {t('chooseAnotherTemplate')}
              </DraftLink>
            </div>

            <div className="border-border-subtle mt-5 border-t pt-5">
              <h3 className="text-text-strong text-sm font-semibold">
                {t('versionChangesTitle')}
              </h3>
              <p className="text-text-muted font-num mt-1 text-xs">
                {display.timestamp(template.updatedAt)}
              </p>
              {template.changelog?.length ? (
                <ul className="mt-3 flex flex-col gap-2">
                  {template.changelog.map((note) => (
                    <li
                      key={note}
                      className="text-text text-sm leading-relaxed text-pretty"
                    >
                      {note}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-text-muted mt-3 text-sm">
                  {t('noChangelogWasSuppliedForThisVersion')}
                </p>
              )}
              <p className="text-text-muted mt-3 text-xs leading-relaxed">
                {t('newTemplateVersionsDoNotChangeAnExistingWorkspace')}
              </p>
            </div>
          </section>
        </aside>
      </div>

      {/* Mobile/tablet: nút chính luôn trong tầm tay thay vì nằm cuối trang */}
      <div className="border-border bg-surface/95 sticky bottom-0 z-20 -mx-5 mt-6 flex flex-col gap-2 border-t px-5 py-3 backdrop-blur md:-mx-8 md:px-8 lg:hidden">
        {create.isError && <DraftError error={create.error} />}
        <div className="flex items-center gap-3">
          <DraftLink
            to={`/drafts/templates?category=${encodeURIComponent(params.get('category') ?? 'All')}`}
            className="text-text-muted hover:text-text-strong shrink-0 text-sm no-underline hover:no-underline"
          >
            <ArrowLeft size={14} aria-hidden="true" />
            <span className="sr-only sm:not-sr-only">
              {t('chooseAnotherTemplate')}
            </span>
          </DraftLink>
          {startButton('flex-1')}
        </div>
      </div>
    </>
  )
}
