import { useCallback, useState, type KeyboardEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { ApiError } from '@/lib/api-client'
import { QUALIFICATION_STATUS } from '@/lib/constants'
import { ToolHeader } from '@/components/ui/layout/tool-header'
import { StatusBadge } from '@/components/ui/display/status-badge'
import { Toast } from '@/components/ui/feedback/toast'
import { ReviewPageLayout } from '@/features/expert-vetting/components/ReviewPageLayout'
import { useAuthStore } from '@/features/auth'
import { useAdminNav } from '@/app/layouts/admin/useAdminNav'
import { getQualificationFile } from '../../features/expert-vetting/api/qualificationApi'
import { ClaimBar } from '../../features/expert-vetting/components/ClaimBar'
import { CompetencyDecisionDialog } from '../../features/expert-vetting/components/CompetencyDecisionDialog'
import { CompetencyResultCard } from '../../features/expert-vetting/components/CompetencyResultCard'
import { CompetencyReview } from '../../features/expert-vetting/components/CompetencyReview'
import { DecisionCard } from '../../features/expert-vetting/components/DecisionSummary'
import { DocumentsTab } from '../../features/expert-vetting/components/DocumentsTab'
import { FinalApprovalPanel } from '../../features/expert-vetting/components/FinalApprovalPanel'
import { HistoryTab } from '../../features/expert-vetting/components/HistoryTab'
import { ProfileTab } from '../../features/expert-vetting/components/ProfileTab'
import { COMPETENCY_OUTCOME } from '../../features/expert-vetting/constants'
import { formatDate } from '../../features/expert-vetting/utils/applications'
import { useQualificationReview } from '../../features/expert-vetting/hooks/useQualificationReview'
import { useReviewClaim } from '../../features/expert-vetting/hooks/useReviewClaim'
import type {
  FinalApprovalDecision,
  QualificationScope,
  ServiceAccessAction,
} from '../../features/expert-vetting/types'

const DECISION_ERRORS = [
  'INVALID_COMPETENCY_CRITERIA',
  'INVALID_COMPETENCY_RESULT',
  'COMPETENCY_NOTE_REQUIRED',
  'COMPETENCY_EVIDENCE_REQUIRED',
  'COMPETENCY_EVIDENCE_UNKNOWN',
  'SELF_REVIEW_NOT_ALLOWED',
  'QUALIFICATION_NOT_IN_REVIEW',
  'REVIEW_NOT_CLAIMED',
  'INFORMATION_REQUEST_LIMIT',
  'QUALIFICATION_NOT_PENDING_APPROVAL',
  'FINAL_APPROVER_IS_REVIEWER',
  'FINAL_APPROVAL_NOTE_REQUIRED',
  'INVALID_FINAL_APPROVAL_DECISION',
  'SERVICE_NOT_APPROVED',
  'SERVICE_NOT_SUSPENDED',
  'SUSPENSION_NOTE_REQUIRED',
  'INVALID_SERVICE_ACCESS_ACTION',
] as const
type DecisionError = (typeof DECISION_ERRORS)[number]
const isDecisionError = (code?: string): code is DecisionError =>
  (DECISION_ERRORS as readonly (string | undefined)[]).includes(code)

type TabKey = 'profile' | 'documents' | 'history'
const TABS: TabKey[] = ['profile', 'documents', 'history']

/* Gate 2 → final approval → approved; FAIL stays on the review step */
const RAIL_STEP: Record<string, number> = {
  PENDING_FINAL_APPROVAL: 1,
  APPROVED_FOR_SERVICE: 3,
  SUSPENDED: 3,
}

/**
 * One Expert-Service qualification: the expert's documents on the left; on the right the C1–C5 form
 * (Gate 2 reviewer) or the Gate 2 result with the final approval actions (System Admin).
 */
export default function AdminQualificationDetailPage({
  scope = 'review',
  embedded = false,
}: {
  scope?: QualificationScope
  embedded?: boolean
}) {
  const { t } = useTranslation(['admin', 'common'])
  const { id = '' } = useParams()
  const nav = useAdminNav(!embedded)
  const review = useQualificationReview(id, scope)
  const userId = useAuthStore((s) => s.user?.id)
  const claim = useReviewClaim('GATE_2', id, review.detail?.claim)
  const isApproval = scope === 'approval'
  const section = isApproval ? 'approvals' : 'competency'
  const listPath = isApproval
    ? '/admin/experts/approvals'
    : embedded ? '/reviewer/gate-2' : '/admin/experts/qualifications'
  const { detail } = review
  const [tab, setTab] = useState<TabKey>('profile')
  const [docKey, setDocKey] = useState<string>()
  const [confirming, setConfirming] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const clearToast = useCallback(() => setToast(null), [])

  const listLink = (
    <Link to={listPath} className="text-fg-muted hover:text-fg-strong">
      {isApproval
        ? t('admin:navigation.finalApproval')
        : t('admin:navigation.competencyReview')}
    </Link>
  )

  if (!detail) {
    return (
      <ReviewPageLayout embedded={embedded} {...nav} section={section} breadcrumb={listLink}>
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

  const onTabKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const i = TABS.indexOf(tab)
    const next = {
      ArrowRight: i + 1,
      ArrowLeft: i - 1,
      Home: 0,
      End: TABS.length - 1,
    }[e.key]
    if (next === undefined) return
    e.preventDefault()
    const key = TABS[(next + TABS.length) % TABS.length]
    setTab(key)
    document.getElementById(`tab-${key}`)?.focus()
  }

  const errorText = (e: unknown) =>
    e instanceof ApiError && isDecisionError(e.code)
      ? t(`admin:competency.errors.${e.code}`)
      : t('admin:competency.errors.failed')

  const finalDecide = (decision: FinalApprovalDecision, note: string) =>
    review
      .approve(decision, note)
      .then(() => {
        setTab('history')
        setToast(t(`admin:finalApproval.toast.${decision}`))
      })
      .catch((e: unknown) => setToast(errorText(e)))

  const accessChange = (action: ServiceAccessAction, note: string) =>
    review
      .changeAccess(action, note)
      .then(() => {
        setTab('history')
        setToast(t(`admin:finalApproval.toast.${action}`))
      })
      .catch((e: unknown) => setToast(errorText(e)))

  const claimError = (e: unknown) =>
    e instanceof ApiError && (e.code === 'REVIEW_CLAIMED' || e.code === 'REVIEW_NOT_CLAIMED')
      ? t(`admin:claim.errors.${e.code}`)
      : t('admin:claim.errors.failed')
  const takeClaim = () => void claim.claim().catch((e: unknown) => setToast(claimError(e)))
  const releaseClaim = () =>
    void claim
      .release()
      .then(() => setToast(t('admin:claim.released')))
      .catch((e: unknown) => setToast(claimError(e)))

  const finish = (note: string) => {
    const outcome = review.outcome
    return review
      .decide(note)
      .then(() => {
        setConfirming(false)
        setTab('history')
        setToast(t(`admin:${COMPETENCY_OUTCOME[outcome].toast}`))
      })
      .catch((e: unknown) => {
        setConfirming(false)
        setToast(errorText(e))
      })
  }

  // Open a blank tab first so the browser does not block the popup after the download
  const openFile = (evidenceId: string) => {
    const win = window.open('', '_blank')
    getQualificationFile(scope, detail.id, evidenceId)
      .then((blob) => {
        if (!blob || !win) throw new Error('no file')
        win.location.href = URL.createObjectURL(blob)
      })
      .catch(() => {
        win?.close()
        setToast(t('admin:detail.documents.openFailed'))
      })
  }

  const expert = detail.profile
  const expertName = !expert.name.trim() || /^[\da-f]{8}(?:-[\da-f]{4}){3}-[\da-f]{12}$/i.test(expert.name)
    ? t('admin:reviewWorkspace.unnamedApplicant')
    : expert.name
  // Show a file in the document viewer of the reference panel, beside the form
  const showDocument = (key: string) => {
    setDocKey(key)
    setTab('documents')
    requestAnimationFrame(() => document.getElementById('panel-documents')?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }))
  }
  const decided = !detail.canDecide
  // Only the reviewer holding the qualification can assess it; everyone else reads it
  const readOnly = !claim.heldByMe
  const history = isApproval
    ? review.history
    : [...review.history, ...claim.history].sort((a, b) => b.at.localeCompare(a.at))
  const years = t('admin:detail.meta.years', { count: expert.years })

  return (
    <ReviewPageLayout
      embedded={embedded}
      {...nav}
      section={section}
      title={expertName}
      breadcrumb={
        <>
          {listLink} <span aria-hidden="true">/</span>{' '}
          <span className="text-fg-strong" aria-current="page">
            {expertName}
          </span>
        </>
      }
    >
      {embedded ? (
        <header className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-text-strong !font-sans text-xl font-semibold tracking-tight break-words">{expertName}</h1>
            <StatusBadge status={QUALIFICATION_STATUS[detail.status]} />
          </div>
          <dl className="text-text-muted mt-1.5 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm [&>div+div]:before:mr-1.5 [&>div+div]:before:content-['·']">
            <div><dt className="sr-only">{t('admin:competency.serviceLabel')}</dt><dd className="text-text-strong inline font-medium">{detail.serviceName}</dd></div>
            <div><dt className="sr-only">{t('admin:detail.meta.experience')}</dt><dd className="inline tabular-nums">{years}</dd></div>
            <div><dt className="inline">{t('admin:detail.meta.submitted')} </dt><dd className="inline tabular-nums">{formatDate(detail.submittedAt)}</dd></div>
            <div><dt className="inline">{t('admin:reviewWorkspace.reference')} </dt><dd title={detail.id} className="inline tabular-nums">{detail.id.slice(0, 8)}</dd></div>
          </dl>
        </header>
      ) : (
      <ToolHeader
        code={detail.id}
        subtitle={[expertName, detail.serviceName, years]
          .filter(Boolean)
          .join(' · ')}
        rail={{
          steps: [
            t('admin:competency.rail.review'),
            t('admin:competency.rail.finalApproval'),
            t('admin:competency.rail.approved'),
          ],
          current: RAIL_STEP[detail.status] ?? 0,
        }}
      />
      )}

      {!isApproval && (
        <div className="mt-5">
          <ClaimBar
            current={claim.current}
            canClaim={claim.canClaim}
            claimable={detail.canDecide}
            pending={claim.pending}
            onClaim={takeClaim}
            onRelease={releaseClaim}
          />
        </div>
      )}

      <div className="mt-5 grid items-start gap-5 xl:grid-cols-[minmax(300px,0.8fr)_minmax(0,1.2fr)]">
        {/* Reference panel: profile, documents with the in-page viewer, history */}
        <div className="border-border bg-surface order-2 min-w-0 overflow-hidden rounded-lg border xl:sticky xl:top-6 xl:order-1">
          <div
            role="tablist"
            aria-label={t('admin:detail.tabAria')}
            onKeyDown={onTabKey}
            className="border-border flex gap-4 overflow-x-auto border-b px-4"
          >
            {TABS.map((key) => (
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
                  '-mb-px min-h-11 shrink-0 border-b-2 px-0.5 text-sm whitespace-nowrap transition-colors',
                  tab === key
                    ? 'border-text-strong text-fg-strong font-medium'
                    : 'text-fg-muted border-transparent'
                )}
              >
                {t(`admin:detail.tabs.${key}`)}
                {key === 'documents' && <span className="text-text-muted ml-1.5 text-xs tabular-nums">{expert.documents.length}</span>}
              </button>
            ))}
          </div>
          <div
            role="tabpanel"
            id={`panel-${tab}`}
            aria-labelledby={`tab-${tab}`}
            className="space-y-4 p-4"
          >
            {tab === 'profile' && (
              <>
                <ProfileTab
                  detail={expert}
                  onOpenDocument={(key) => {
                    setDocKey(key)
                    setTab('documents')
                  }}
                />
                <DecisionCard detail={expert} />
              </>
            )}
            {tab === 'documents' && (
              <DocumentsTab
                key={docKey}
                documents={expert.documents}
                initialCode={docKey}
                reviewedFlags={[]}
                onToggleReviewed={() => undefined}
                onOpenFile={openFile}
                loadFile={(evidenceId) => getQualificationFile(scope, detail.id, evidenceId)}
              />
            )}
            {tab === 'history' && <HistoryTab variant="panel" history={history} />}
          </div>
        </div>

        {isApproval ? (
          <div className="order-1 space-y-4 md:space-y-6 xl:order-2">
            <CompetencyResultCard detail={detail} />
            <FinalApprovalPanel
              key={detail.status}
              detail={detail}
              isGate2Reviewer={
                !!userId && userId === detail.competencyReviewerUserId
              }
              submitting={review.approving}
              onDecide={(decision, note) => void finalDecide(decision, note)}
              onAccess={(action, note) => void accessChange(action, note)}
            />
          </div>
        ) : decided ? (
          <div className="order-1 xl:order-2">
            <CompetencyResultCard detail={detail} />
          </div>
        ) : (
          <div className="order-1 min-w-0 xl:order-2">
            <CompetencyReview
              assessments={review.assessments}
              documents={expert.documents}
              previous={detail.competencies}
              submitted={detail.submitted}
              rounds={detail.rounds}
              disabled={review.deciding || readOnly}
              onResult={review.setResult}
              onNote={review.setNote}
              onToggleEvidence={review.toggleEvidence}
              onShowDocument={showDocument}
              onConclude={() => setConfirming(true)}
              canConclude={review.canDecide && !readOnly}
            />
          </div>
        )}
      </div>

      {confirming && (
        <CompetencyDecisionDialog
          expertName={expert.name}
          serviceName={detail.serviceName}
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
