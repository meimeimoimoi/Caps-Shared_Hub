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
import { DecisionBar } from '@/components/ui/actions/decision-bar'
import { Toast } from '@/components/ui/feedback/toast'
import { ReviewPageLayout } from '@/features/expert-vetting/components/ReviewPageLayout'
import { getEvidenceFile } from '../../features/expert-vetting/api/adminApi'
import { AiScreeningTab } from '../../features/expert-vetting/components/AiScreeningTab'
import { DecisionDialog } from '../../features/expert-vetting/components/DecisionDialog'
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
  ELIGIBILITY_CODES,
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

      <div className="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(280px,0.78fr)_minmax(0,1.22fr)]">
        {/* Reference information stays available beside the assessment. */}
        <div className="border-border bg-surface order-2 min-w-0 overflow-hidden rounded-2xl border lg:order-1">
          {embedded && (
            <header className="border-border border-b px-5 py-5 sm:px-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h1 className="text-text-strong min-w-0 text-xl font-semibold tracking-tight break-words">{detail.name}</h1>
                <StatusBadge status={APPLICATION_STATUS[status]} />
              </div>
              <p className="text-text-muted mt-1 text-sm leading-6">{jobTitle}</p>
              <dl className="text-text-muted mt-4 space-y-2 text-xs">
                <div className="flex flex-wrap gap-x-2 gap-y-1"><dt>{t('reviewWorkspace.reference')}</dt><dd className="text-text-strong min-w-0 break-all">{detail.id}</dd></div>
                <div className="flex flex-wrap gap-x-2 gap-y-1"><dt>{t('detail.meta.submitted')}</dt><dd className="text-text-strong tabular-nums">{formatDate(detail.submittedAt)}</dd></div>
              </dl>
            </header>
          )}
          <div
            role="tablist"
            aria-label={t('admin:detail.tabAria')}
            onKeyDown={onTabKey}
            className="border-border bg-surface-muted/40 flex gap-5 overflow-x-auto border-b px-5 pt-2 sm:px-6"
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
                  '-mb-px min-h-12 shrink-0 border-b-2 px-1 py-3 text-sm whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-offset-[-3px]',
                  tab === key
                    ? 'border-indicator text-fg-strong font-semibold'
                    : 'text-fg-muted border-transparent'
                )}
              >
                {label}
                {key === 'documents' && <span className="bg-surface-muted text-text-muted ml-2 rounded px-1.5 py-0.5 text-xs tabular-nums">{detail.documents.length}</span>}
              </button>
            ))}
          </div>

          <div
            role="tabpanel"
            id={`panel-${tab}`}
            aria-labelledby={`tab-${tab}`}
            tabIndex={0}
            className="p-5 focus-visible:outline-2 focus-visible:outline-offset-[-3px] sm:p-6"
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
                documents={detail.documents}
                initialCode={docKey}
                reviewedFlags={review.reviewedFlags}
                onToggleReviewed={review.toggleFlagReviewed}
                onOpenFile={openFile}
              />
            )}
            {tab === 'history' && <HistoryTab history={review.history} />}
          </div>
        </div>

        {/* The primary workspace is wider than the reference panel. */}
        {decided ? (
          <div className="order-1 space-y-4 md:space-y-6 lg:order-2">
            <DecisionCard detail={detail} />
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
          <div className="order-1 min-w-0 lg:order-2">
            <EligibilityReview
              key={detail.id}
              detail={detail}
              assessments={review.assessments}
              disabled={review.deciding}
              onResult={review.setResult}
              onNote={review.setNote}
            />
        <DecisionBar
          className="!static !mx-0 !mt-4 !mb-0 !flex-col !items-stretch !gap-4 !rounded-xl !border !border-[var(--ui-border)] !bg-[var(--ui-surface)] !px-5 !py-4 !shadow-none [&>div]:!ml-0 [&>div]:w-full [&>div]:justify-end [&_.btn]:min-h-11 [&_.btn]:h-auto [&_.btn]:whitespace-normal [&_.btn]:py-3"
          blockers={blockers}
          ready={`${t('admin:eligibility.ready', {
            count: ELIGIBILITY_CODES.length,
            total: ELIGIBILITY_CODES.length,
          })} · ${t('admin:eligibility.outcomeLabel')}: ${APPLICATION_STATUS[review.outcome].label}`}
          primary={{
            label: t(`admin:${ELIGIBILITY_OUTCOME[review.outcome].confirm}`),
            onClick: () => setConfirming(true),
            disabled: !review.canDecide,
          }}
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
