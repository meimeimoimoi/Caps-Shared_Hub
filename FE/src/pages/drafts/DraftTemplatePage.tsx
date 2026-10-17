import { useDraftPresentation } from '@/features/drafting/hooks/useDraftPresentation'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  ArrowRight,
  ChevronRight,
  FileSpreadsheet,
  FileText,
  History,
  Info,
  MessageSquare,
} from 'lucide-react'
import {
  useDraftContext,
  useTemplates,
} from '@/features/drafting/hooks/useDrafting'
import {
  DraftButton,
  DraftHeading,
  DraftLink,
  DraftLoading,
  DraftError,
} from '@/features/drafting/components/DraftUi'
import { isDraftMock } from '@/features/drafting/api/dataSource'
import { MotionReveal, MotionStagger } from '@/components/ui/motion'
import { Modal } from '@/components/ui/feedback/modal'
import { cn } from '@/lib/utils'
import type { TemplateVersion } from '@/features/drafting/types'

/* Phạm vi nghiệp vụ: 2 loại tài liệu. Biểu tượng theo bản chất: công văn (văn bản) / tờ khai (bảng số liệu) */
const KIND_ICON: Record<string, typeof FileText> = {
  Explanation: FileText,
  Finalization: FileSpreadsheet,
}

// Mô tả tiếng Việt theo loại; fixture demo chỉ có mô tả tiếng Anh
const SUMMARY_KEY = {
  Explanation: 'templateSummaryExplanation',
  Finalization: 'templateSummaryFinalization',
} as const satisfies Record<string, string>

interface TemplateGroup {
  templateId: string
  /** Phiên bản dùng để soạn mới; không có thì lấy bản mới nhất để hiển thị */
  current: TemplateVersion
  versions: TemplateVersion[]
}

/* Gom các phiên bản theo mẫu gốc, mới nhất trước */
function groupTemplates(list: TemplateVersion[]): TemplateGroup[] {
  const byId = new Map<string, TemplateVersion[]>()
  for (const item of list) {
    byId.set(item.templateId, [...(byId.get(item.templateId) ?? []), item])
  }
  return [...byId.entries()].map(([templateId, items]) => {
    const versions = [...items].sort((a, b) => b.version - a.version)
    return {
      templateId,
      current: versions.find((v) => v.status === 'ACTIVE') ?? versions[0],
      versions,
    }
  })
}

function TemplateCard({ group }: { group: TemplateGroup }) {
  const { t } = useTranslation('drafting')
  const display = useDraftPresentation()
  const { current, versions } = group
  const { t: tCommon } = useTranslation('common')
  const [historyOpen, setHistoryOpen] = useState(false)
  const Icon = KIND_ICON[current.category] ?? FileText
  const active = current.status === 'ACTIVE'
  const ready = active && current.fields.length > 0
  const summaryKey =
    current.category in SUMMARY_KEY
      ? SUMMARY_KEY[current.category as keyof typeof SUMMARY_KEY]
      : undefined
  const summary = summaryKey ? t(summaryKey) : current.description

  return (
    <article className="bg-surface border-border flex h-full min-w-0 flex-col rounded-2xl border shadow-xs transition-shadow duration-200 hover:shadow-md">
      <div className="flex flex-1 flex-col gap-4 p-6">
        <div className="flex items-start justify-between gap-3">
          <span className="bg-accent-soft text-accent-text flex size-11 items-center justify-center rounded-xl">
            <Icon size={22} aria-hidden="true" />
          </span>
          <span
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium',
              ready
                ? 'bg-success-soft text-success'
                : active
                  ? 'bg-sunken text-fg-muted'
                  : 'bg-danger-soft text-danger'
            )}
          >
            <span
              aria-hidden="true"
              className="size-1.5 rounded-full bg-current"
            />
            {ready
              ? t('availableForDrafting')
              : active
                ? t('inputFormNotAvailable')
                : t('noActiveVersion')}
          </span>
        </div>

        <div className="flex flex-col gap-2">
          <p className="text-text-muted text-xs font-semibold tracking-[0.06em] uppercase">
            {display.category(current.category)}
          </p>
          <h2 className="text-text-strong font-serif text-xl leading-snug text-balance">
            {current.title}
          </h2>
          <p className="text-text-muted text-sm leading-relaxed text-pretty">
            {summary}
          </p>
        </div>

        <dl className="text-text-muted mt-auto flex flex-wrap gap-x-5 gap-y-1 text-xs">
          <div className="flex gap-1">
            <dt>{t('versionLabel')}</dt>
            <dd className="font-num text-text-strong font-semibold">
              v{current.version}
            </dd>
          </div>
          <div className="flex gap-1">
            <dt>{t('updatedLabel')}</dt>
            <dd className="font-num text-text-strong">
              {display.timestamp(current.updatedAt)}
            </dd>
          </div>
          {ready && (
            <div className="flex gap-1">
              <dt>{t('fieldsLabel')}</dt>
              <dd className="font-num text-text-strong">
                {display.number(current.fields.length)}
              </dd>
            </div>
          )}
        </dl>

        <DraftLink
          to={`/drafts/templates/${current.id}`}
          primary={ready}
          className={cn(
            'group w-full gap-2 rounded-xl',
            !ready &&
              'border-border text-text-strong hover:bg-sunken justify-center rounded-xl border no-underline hover:no-underline'
          )}
        >
          {ready ? t('startDrafting') : t('viewTemplate')}
          <ArrowRight
            size={16}
            aria-hidden="true"
            className="transition-transform duration-200 group-hover:translate-x-0.5"
          />
        </DraftLink>
      </div>

      <button
        type="button"
        onClick={() => setHistoryOpen(true)}
        className="border-border-subtle text-text-muted hover:text-text-strong hover:bg-sunken focus-visible:outline-accent flex min-h-12 w-full cursor-pointer items-center justify-between gap-2 rounded-b-2xl border-t px-6 py-3 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2"
      >
        <span className="flex items-center gap-2">
          <History size={16} aria-hidden="true" />
          {t('versionHistory', { count: versions.length })}
        </span>
        <ChevronRight size={16} aria-hidden="true" />
      </button>

      {historyOpen && (
        <Modal
          size="lg"
          title={t('versionHistoryTitle')}
          onClose={() => setHistoryOpen(false)}
          footer={
            <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
              <p className="text-text-muted flex items-start gap-2 text-xs leading-relaxed">
                <Info
                  size={14}
                  aria-hidden="true"
                  className="mt-0.5 shrink-0"
                />
                {t('versionHistoryNote')}
              </p>
              <DraftButton
                secondary
                className="shrink-0"
                onClick={() => setHistoryOpen(false)}
              >
                {tCommon('actions.close')}
              </DraftButton>
            </div>
          }
        >
          <div className="border-border-subtle mt-4 mb-5 flex flex-wrap items-end justify-between gap-x-6 gap-y-1 border-b pb-4">
            <div className="min-w-0">
              <p className="text-text-muted text-xs font-semibold tracking-[0.06em] uppercase">
                {display.category(current.category)}
              </p>
              <p className="text-text-strong mt-1 font-serif text-lg leading-snug text-balance">
                {current.title}
              </p>
            </div>
            <p className="text-text-muted shrink-0 text-sm">
              {t('versionCount', { count: versions.length })}
            </p>
          </div>

          {/* Dòng thời gian: mới nhất ở trên, phiên bản đang dùng có chấm đặc */}
          <ol className="relative">
            {versions.map((version, index) => {
              const inUse = version.status === 'ACTIVE'
              const last = index === versions.length - 1
              return (
                <li
                  key={version.id}
                  className="relative flex gap-4 pb-5 last:pb-0"
                >
                  {!last && (
                    <span
                      aria-hidden="true"
                      className="bg-border absolute top-5 bottom-0 left-[7px] w-px"
                    />
                  )}
                  <span
                    aria-hidden="true"
                    className={cn(
                      'relative mt-0.5 size-[15px] shrink-0 rounded-full border-2',
                      inUse
                        ? 'border-accent bg-accent ring-accent/15 ring-4'
                        : 'border-border bg-surface'
                    )}
                  />
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
                      <div className="flex items-center gap-2.5">
                        <h3 className="text-text-strong text-sm font-semibold">
                          {t('versionNumber', { n: version.version })}
                        </h3>
                        <span
                          className={cn(
                            'rounded-full px-2 py-0.5 text-xs font-medium',
                            inUse
                              ? 'bg-success-soft text-success'
                              : 'bg-sunken text-fg-muted'
                          )}
                        >
                          {inUse ? t('versionInUse') : t('versionRetired')}
                        </span>
                      </div>
                      <p className="font-num text-text-muted text-xs">
                        {display.timestamp(version.updatedAt)}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-baseline justify-between gap-x-6">
                      {version.changelog?.[0] && (
                        <p className="text-text min-w-0 flex-1 text-sm leading-relaxed text-pretty">
                          {version.changelog[0]}
                        </p>
                      )}
                      <DraftLink
                        to={`/drafts/templates/${version.id}`}
                        className="group -my-2 shrink-0 text-sm font-medium"
                      >
                        {t('viewVersion')}
                        <ArrowRight
                          size={14}
                          aria-hidden="true"
                          className="transition-transform duration-200 group-hover:translate-x-0.5"
                        />
                      </DraftLink>
                    </div>
                  </div>
                </li>
              )
            })}
          </ol>
        </Modal>
      )}
    </article>
  )
}

export default function DraftTemplatePage() {
  const { t } = useTranslation('drafting')
  const query = useTemplates()
  const ctx = useDraftContext()
  const groups = query.data ? groupTemplates(query.data) : []

  return (
    <>
      <DraftHeading
        title={t('chooseADocumentTemplate')}
        description={t(
          'startWithAVersionedTemplateYourConfirmedInputWillBeKeptSeparateFromTheAiDraft'
        )}
        step={0}
      />
      {isDraftMock && ctx.scenario === 'chat-suggestion' && (
        <div className="border-border bg-surface mb-6 flex items-start gap-3 rounded-2xl border p-5">
          <MessageSquare className="text-accent mt-1 shrink-0" size={20} />
          <div>
            <h2 className="text-h2">
              {t('aSuggestionFromYourDemoConversation')}
            </h2>
            <p className="text-fg-muted mt-2">
              {t(
                'theExpenseExplanationTemplateMatchesTheSyntheticConversationChoosingItImportsEditableSuggestionsIntoWorkingInputNothingIsConfirmedAutomatically'
              )}
            </p>
          </div>
        </div>
      )}
      {query.isPending ? (
        <DraftLoading message={t('loadingTemplateVersions')} />
      ) : query.isError ? (
        <DraftError error={query.error} retry={() => void query.refetch()} />
      ) : groups.length ? (
        <MotionStagger className="grid max-w-5xl gap-5 md:grid-cols-2">
          {groups.map((group) => (
            <MotionReveal
              key={group.templateId}
              preset="reveal"
              className="h-full"
            >
              <TemplateCard group={group} />
            </MotionReveal>
          ))}
        </MotionStagger>
      ) : (
        <p className="text-fg-muted py-8">{t('noTemplatesInThisCategory')}</p>
      )}
    </>
  )
}
