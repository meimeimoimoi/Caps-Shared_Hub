import { useCallback, useState, type KeyboardEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { ApiError } from '@/lib/api-client'
import { QUALIFICATION_STATUS } from '@/lib/constants'
import { ToolHeader } from '@/components/ui/layout/tool-header'
import { DecisionBar } from '@/components/ui/actions/decision-bar'
import { Toast } from '@/components/ui/feedback/toast'
import { AdminLayout } from '@/app/layouts/admin/AdminLayout'
import { useAuthStore } from '@/features/auth'
import { useAdminNav } from '@/app/layouts/admin/useAdminNav'
import { getQualificationFile } from '../../features/expert-vetting/api/qualificationApi'
import { CompetencyDecisionDialog } from '../../features/expert-vetting/components/CompetencyDecisionDialog'
import { CompetencyResultCard } from '../../features/expert-vetting/components/CompetencyResultCard'
import { CompetencyReview } from '../../features/expert-vetting/components/CompetencyReview'
import { DecisionCard } from '../../features/expert-vetting/components/DecisionSummary'
import { DocumentsTab } from '../../features/expert-vetting/components/DocumentsTab'
import { FinalApprovalPanel } from '../../features/expert-vetting/components/FinalApprovalPanel'
import { HistoryTab } from '../../features/expert-vetting/components/HistoryTab'
import { ProfileTab } from '../../features/expert-vetting/components/ProfileTab'
import {
  COMPETENCY_CODES,
  COMPETENCY_OUTCOME,
} from '../../features/expert-vetting/constants'
import { useQualificationReview } from '../../features/expert-vetting/hooks/useQualificationReview'
import type {
  FinalApprovalDecision,
  QualificationScope,
} from '../../features/expert-vetting/types'

const DECISION_ERRORS = [
  'INVALID_COMPETENCY_CRITERIA',
  'INVALID_COMPETENCY_RESULT',
  'COMPETENCY_NOTE_REQUIRED',
  'COMPETENCY_EVIDENCE_REQUIRED',
  'COMPETENCY_EVIDENCE_UNKNOWN',
  'SELF_REVIEW_NOT_ALLOWED',
  'QUALIFICATION_NOT_IN_REVIEW',
  'QUALIFICATION_NOT_PENDING_APPROVAL',
  'FINAL_APPROVER_IS_REVIEWER',
  'FINAL_APPROVAL_NOTE_REQUIRED',
  'INVALID_FINAL_APPROVAL_DECISION',
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
}: {
  scope?: QualificationScope
}) {
  const { t } = useTranslation(['admin', 'common'])
  const { id = '' } = useParams()
  const nav = useAdminNav()
  const review = useQualificationReview(id, scope)
  const userId = useAuthStore((s) => s.user?.id)
  const isApproval = scope === 'approval'
  const section = isApproval ? 'approvals' : 'competency'
  const listPath = isApproval
    ? '/admin/experts/approvals'
    : '/admin/experts/qualifications'
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
      <AdminLayout {...nav} section={section} breadcrumb={listLink}>
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
      </AdminLayout>
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
  const decided = !detail.canDecide
  const years = t('admin:detail.meta.years', { count: expert.years })

  return (
    <AdminLayout
      {...nav}
      section={section}
      title={expert.name}
      breadcrumb={
        <>
          {listLink} <span aria-hidden="true">/</span>{' '}
          <span className="text-fg-strong" aria-current="page">
            {expert.name}
          </span>
        </>
      }
    >
      <ToolHeader
        code={detail.id}
        subtitle={[expert.name, detail.serviceName, years]
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

      <div className="mt-6 grid items-start gap-4 md:gap-6 lg:grid-cols-[minmax(420px,1fr)_380px]">
        <div className="min-w-0">
          <div
            role="tablist"
            aria-label={t('admin:detail.tabAria')}
            onKeyDown={onTabKey}
            className="mb-4 flex gap-7 overflow-x-auto"
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
                  'border-b-2 pb-2 whitespace-nowrap',
                  tab === key
                    ? 'border-indicator text-fg-strong font-semibold'
                    : 'text-fg-muted border-transparent'
                )}
              >
                {t(`admin:detail.tabs.${key}`)}
              </button>
            ))}
          </div>
          <div
            role="tabpanel"
            id={`panel-${tab}`}
            aria-labelledby={`tab-${tab}`}
            className="space-y-4 md:space-y-6"
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
                documents={expert.documents}
                initialCode={docKey}
                reviewedFlags={[]}
                onToggleReviewed={() => undefined}
                onOpenFile={openFile}
              />
            )}
            {tab === 'history' && <HistoryTab history={review.history} />}
          </div>
        </div>

        {isApproval ? (
          <div className="space-y-4 md:space-y-6">
            <CompetencyResultCard detail={detail} />
            <FinalApprovalPanel
              detail={detail}
              isGate2Reviewer={
                !!userId && userId === detail.competencyReviewerUserId
              }
              submitting={review.approving}
              onDecide={(decision, note) => void finalDecide(decision, note)}
            />
          </div>
        ) : decided ? (
          <CompetencyResultCard detail={detail} />
        ) : (
          <div className="lg:sticky lg:top-20 lg:max-h-[calc(100vh-160px)] lg:overflow-y-auto">
            <CompetencyReview
              assessments={review.assessments}
              documents={expert.documents}
              previous={detail.competencies}
              disabled={review.deciding}
              onResult={review.setResult}
              onNote={review.setNote}
              onToggleEvidence={review.toggleEvidence}
            />
          </div>
        )}
      </div>

      {!decided && !isApproval && (
        <DecisionBar
          className="-mx-4 mt-12 -mb-12 md:-mx-6 lg:-mx-8"
          blockers={
            review.remaining > 0
              ? [
                  {
                    text: t('admin:competency.remaining', {
                      count: review.remaining,
                    }),
                  },
                ]
              : []
          }
          ready={`${t('admin:competency.ready', {
            count: COMPETENCY_CODES.length,
          })} · ${t('admin:eligibility.outcomeLabel')}: ${QUALIFICATION_STATUS[review.outcome].label}`}
          primary={{
            label: t(`admin:${COMPETENCY_OUTCOME[review.outcome].confirm}`),
            onClick: () => setConfirming(true),
            disabled: !review.canDecide,
          }}
        />
      )}

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
    </AdminLayout>
  )
}
