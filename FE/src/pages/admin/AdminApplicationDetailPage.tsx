import { useCallback, useState, type KeyboardEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ApiError } from '@/lib/api-client'
import {
  APPLICATION_RAIL_STEP,
  APPLICATION_STATUS,
  RAIL_APPLICATION,
} from '@/lib/constants'
import { ToolHeader } from '@/components/ui/layout/tool-header'
import { CaseHeader } from '@/components/ui/layout/case-header'
import { Toast } from '@/components/ui/feedback/toast'
import { ReviewPageLayout } from '@/features/expert-vetting/components/ReviewPageLayout'
import { getEvidenceFile } from '../../features/expert-vetting/api/adminApi'
import { AiScreeningTab } from '../../features/expert-vetting/components/AiScreeningTab'
import { DecisionDialog } from '../../features/expert-vetting/components/DecisionDialog'
import { EligibilityDecisionPanel } from '../../features/expert-vetting/components/EligibilityDecisionPanel'
import { EligibilityReview } from '../../features/expert-vetting/components/EligibilityReview'
import {
  DecisionCard,
  AiSummaryCard,
} from '../../features/expert-vetting/components/DecisionSummary'
import { DocumentsTab } from '../../features/expert-vetting/components/DocumentsTab'
import { HistoryTab } from '../../features/expert-vetting/components/HistoryTab'
import { ProfileTab } from '../../features/expert-vetting/components/ProfileTab'
import {
  CURRENT_ADMIN,
  ELIGIBILITY_OUTCOME,
} from '../../features/expert-vetting/constants'
import { formatDate } from '../../features/expert-vetting/utils/applications'
import { useAdminNav } from '@/app/layouts/admin/useAdminNav'
import { useApplicationReview } from '../../features/expert-vetting/hooks/useApplicationReview'
import { useTranslation } from 'react-i18next'
import { StatusBadge } from '@/components/ui/display/status-badge'

const DECISION_ERRORS = [
  'INVALID_ELIGIBILITY_CRITERIA',
  'INVALID_ELIGIBILITY_RESULT',
  'ELIGIBILITY_NOTE_REQUIRED',
  'EXPERIENCE_BELOW_MINIMUM',
  'SELF_REVIEW_NOT_ALLOWED',
  'APPLICATION_NOT_IN_REVIEW',
] as const
type DecisionError = (typeof DECISION_ERRORS)[number]
const isDecisionError = (code?: string): code is DecisionError =>
  (DECISION_ERRORS as readonly (string | undefined)[]).includes(code)

type TabKey = 'profile' | 'documents' | 'ai' | 'history'

export default function AdminApplicationDetailPage({ embedded = false }: { embedded?: boolean }) {
  const { t } = useTranslation(['admin', 'common'])
  const { id = '' } = useParams()
  const nav = useAdminNav(!embedded)
  const review = useApplicationReview(id)
  const { detail, status } = review
  // AI screening is postponed: the tab only exists for demo fixtures
  const tabs = [
    { key: 'profile', label: t('admin:detail.tabs.profile') },
    { key: 'documents', label: t('admin:detail.tabs.documents') },
    ...(detail?.screening
      ? [{ key: 'ai', label: t('admin:detail.tabs.ai') } as const]
      : []),
    { key: 'history', label: t('admin:detail.tabs.history') },
  ] as const
  const [chosenTab, setTab] = useState<TabKey>()
  const tab: TabKey = chosenTab ?? (detail?.screening ? 'ai' : 'profile')
  const [docKey, setDocKey] = useState<string>()
  const [confirming, setConfirming] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const clearToast = useCallback(() => setToast(null), [])
  const listPath = embedded ? '/reviewer/gate-1' : '/admin/experts/pending'

  const listLink = (
    <Link
      to={listPath}
      className="text-fg-muted hover:text-fg-strong inline-flex min-h-10 items-center gap-2 rounded focus-visible:outline-2 focus-visible:outline-offset-4"
    >
      <ArrowLeft size={16} aria-hidden="true" />{t('admin:navigation.pendingExperts')}
    </Link>
  )

  if (!detail || !status) {
    return (
      <ReviewPageLayout
        embedded={embedded}
        {...nav}
        section="pending"
        breadcrumb={listLink}
        pendingCount={nav.pendingCount}
      >
        <h1 className="text-h1-tool">
          {review.isLoading
            ? t('common:loading')
            : (review.error?.message ?? t('admin:detail.notFound', { id }))}
        </h1>
        <Link
          to={listPath}
          className="text-accent-text mt-3 inline-block underline"
        >
          {t('admin:detail.backToList')}
        </Link>
      </ReviewPageLayout>
    )
  }

  // Arrow keys, Home and End move both the selected tab and keyboard focus.
  const onTabKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const i = tabs.findIndex((t) => t.key === tab)
    const next = {
      ArrowRight: i + 1,
      ArrowLeft: i - 1,
      Home: 0,
      End: tabs.length - 1,
    }[e.key]
    if (next === undefined) return
    e.preventDefault()
    const key = tabs[(next + tabs.length) % tabs.length].key
    setTab(key)
    document.getElementById(`tab-${key}`)?.focus()
  }

  const errorText = (e: unknown) =>
    e instanceof ApiError && isDecisionError(e.code)
      ? t(`admin:eligibility.errors.${e.code}`)
      : t('admin:eligibility.errors.failed')

  const finish = (note: string) => {
    const outcome = review.outcome
    return review
      .decide(note)
      .then(() => {
        setConfirming(false)
        setTab('history')
        setToast(t(`admin:${ELIGIBILITY_OUTCOME[outcome].toast}`))
      })
      .catch((e: unknown) => {
        setConfirming(false)
        setToast(errorText(e))
      })
  }

  // Show a file in the document viewer of the reference panel, beside the assessment
  const showDocument = (key: string) => {
    setDocKey(key)
    setTab('documents')
    requestAnimationFrame(() => document.getElementById('panel-documents')?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }))
  }

  // Open a blank tab first so the browser does not block the popup after the download
  const openFile = (evidenceId: string) => {
    const win = window.open('', '_blank')
    getEvidenceFile(detail.id, evidenceId)
      .then((blob) => {
        if (!blob || !win) throw new Error('no file')
        win.location.href = URL.createObjectURL(blob)
      })
      .catch(() => {
        win?.close()
        setToast(t('admin:detail.documents.openFailed'))
      })
  }

  const blockers = [
    review.remaining > 0 && {
      text: t('admin:eligibility.remaining', { count: review.remaining }),
    },
    review.unreviewedFlags > 0 && {
      text: t('admin:detail.blockers.flags', { count: review.unreviewedFlags }),
      tone: 'warning' as const,
    },
  ].filter((b) => !!b)

  const railStep = APPLICATION_RAIL_STEP[status]
  // The last step shows the status label once there is a result, e.g. "Được duyệt"
  const railSteps = [
    ...RAIL_APPLICATION.slice(0, -1),
    railStep >= RAIL_APPLICATION.length
      ? APPLICATION_STATUS[status].label
      : RAIL_APPLICATION[RAIL_APPLICATION.length - 1],
  ]
  const decided = !detail.canDecide
  const jobTitle = [detail.jobTitle, detail.company].filter(Boolean).join(', ')
  const years = t('admin:detail.meta.years', { count: detail.years })

  return (
    <ReviewPageLayout
      embedded={embedded}
      {...nav}
      section="pending"
      title={detail.name}
      breadcrumb={
        <>
          {listLink} <span aria-hidden="true">/</span>{' '}
          <span className="text-fg-strong" aria-current="page">
            {detail.name}
          </span>
        </>
      }
    >
      {embedded ? null : decided ? (
        <CaseHeader
          code={detail.id}
          title={detail.name}
          meta={[
            [t('admin:detail.meta.jobTitle'), jobTitle],
            [t('admin:detail.meta.experience'), years],
            [t('admin:detail.meta.submitted'), formatDate(detail.submittedAt)],
          ]}
          rail={{ steps: railSteps, current: railStep }}
        />
      ) : (
        <ToolHeader
          code={detail.id}
          subtitle={[detail.name, detail.jobTitle, years]
            .filter(Boolean)
            .join(' · ')}
          rail={{ steps: railSteps, current: railStep }}
        />
      )}

      {embedded && (
        <header className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-text-strong !font-sans text-xl font-semibold tracking-tight break-words">{detail.name}</h1>
            <StatusBadge status={APPLICATION_STATUS[status]} />
          </div>
          <dl className="text-text-muted mt-1.5 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm [&>div+div]:before:mr-1.5 [&>div+div]:before:content-['·']">
            {jobTitle && <div><dt className="sr-only">{t('detail.meta.jobTitle')}</dt><dd className="inline">{jobTitle}</dd></div>}
            <div><dt className="sr-only">{t('detail.meta.experience')}</dt><dd className="inline tabular-nums">{years}</dd></div>
            <div><dt className="inline">{t('detail.meta.submitted')} </dt><dd className="inline tabular-nums">{formatDate(detail.submittedAt)}</dd></div>
            <div><dt className="inline">{t('reviewWorkspace.reference')} </dt><dd title={detail.id} className="inline tabular-nums">{detail.id.slice(0, 8)}</dd></div>
          </dl>
        </header>
      )}

      {/* While assessing, the reference panel widens when a document is open so files are readable beside the
          editor. Once decided, the columns stay fixed: the record is read on the left and the short result card
          does not jump in width when switching tabs. */}
      {/* Both columns share the row height: the assessment sets it and the reference panel scrolls inside it */}
      <div className={cn('mt-5 grid items-start gap-5 xl:items-stretch', decided ? 'xl:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)]' : tab === 'documents' ? 'xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]' : 'xl:grid-cols-[minmax(300px,0.8fr)_minmax(0,1.2fr)]')}>
        {/* Reference information stays available beside the assessment; it scrolls inside the viewport */}
        {/* While assessing, the panel takes the editor's height and scrolls inside it. Once decided it shows
            everything at its own height and the result card beside it stretches to match, so nothing scrolls */}
        <div className={cn('border-border bg-surface order-2 min-w-0 overflow-hidden rounded-lg border xl:order-1 xl:flex xl:flex-col', !decided && 'xl:h-0 xl:min-h-full')}>
          <div
            role="tablist"
            aria-label={t('admin:detail.tabAria')}
            onKeyDown={onTabKey}
            className="border-border flex shrink-0 gap-4 overflow-x-auto border-b px-4"
          >
            {tabs.map(({ key, label }) => (
              <button
                key={key}
                type="button"
                role="tab"
                id={`tab-${key}`}
                aria-controls={`panel-${key}`}
                aria-selected={tab === key}
                tabIndex={tab === key ? 0 : -1}
                onClick={() => setTab(key)}
                className={cn(
                  '-mb-px min-h-11 shrink-0 border-b-2 px-0.5 text-sm whitespace-nowrap transition-colors focus-visible:!outline-none focus-visible:text-text-strong focus-visible:underline focus-visible:underline-offset-4',
                  tab === key
                    ? 'border-text-strong text-fg-strong font-medium'
                    : 'text-fg-muted border-transparent'
                )}
              >
                {label}
                {key === 'documents' && <span className="text-text-muted ml-1.5 text-xs tabular-nums">{detail.documents.length}</span>}
              </button>
            ))}
          </div>

          <div
            role="tabpanel"
            id={`panel-${tab}`}
            aria-labelledby={`tab-${tab}`}
            tabIndex={0}
            className={cn('p-4 focus-visible:outline-2 focus-visible:outline-offset-[-3px]', !decided && 'xl:min-h-0 xl:flex-1 xl:overflow-y-auto')}
          >
            {tab === 'ai' && detail.screening && (
              <AiScreeningTab
                screening={detail.screening}
                reviewedFlags={review.reviewedFlags}
                onToggleReviewed={review.toggleFlagReviewed}
                onRequestSupplement={review.requestFromFlags}
              />
            )}
            {tab === 'profile' && (
              <ProfileTab
                detail={detail}
                onOpenDocument={(key) => {
                  setDocKey(key)
                  setTab('documents')
                }}
              />
            )}
            {tab === 'documents' && (
              <DocumentsTab
                key={docKey}
                documents={detail.documents}
                submissions={detail.submissions ?? []}
                initialCode={docKey}
                reviewedFlags={review.reviewedFlags}
                onToggleReviewed={review.toggleFlagReviewed}
                onOpenFile={openFile}
                loadFile={(evidenceId) => getEvidenceFile(detail.id, evidenceId)}
              />
            )}
            {tab === 'history' && <HistoryTab variant="panel" history={review.history} />}
          </div>
        </div>

        {/* The primary workspace is wider than the reference panel. */}
        {decided ? (
          <div className="order-1 space-y-4 md:space-y-6 xl:order-2 xl:flex xl:flex-col">
            {/* Stretches to the reference panel's height so both cards end on the same line */}
            <DecisionCard detail={detail} className="xl:flex-1" />
            {detail.screening && (
              <AiSummaryCard
                screening={detail.screening}
                flagReviews={review.flagReviews}
                reviewer={CURRENT_ADMIN}
                onOpenDetail={() => setTab('ai')}
              />
            )}
          </div>
        ) : (
          <div className="order-1 min-w-0 xl:order-2 xl:flex xl:min-h-[36rem] xl:flex-col">
            <EligibilityReview
              key={detail.id}
              detail={detail}
              assessments={review.assessments}
              disabled={review.deciding}
              onResult={review.setResult}
              onNote={review.setNote}
              setAsideNote={review.setAsideNote}
              onRestoreNote={review.restoreNote}
              onShowDocument={showDocument}
            />
        <EligibilityDecisionPanel
          outcome={review.outcome}
          blockers={blockers}
          disabled={!review.canDecide}
          onConfirm={() => setConfirming(true)}
        />
          </div>
        )}
      </div>



      {confirming && (
        <DecisionDialog
          applicantName={detail.name}
          outcome={review.outcome}
          assessments={review.assessments}
          submitting={review.deciding}
          onCancel={() => setConfirming(false)}
          onConfirm={(note) => void finish(note)}
        />
      )}
      {toast && <Toast message={toast} onDone={clearToast} />}
    </ReviewPageLayout>
  )
}
