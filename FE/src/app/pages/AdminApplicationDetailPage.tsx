import { useCallback, useState, type KeyboardEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { cn } from '@/lib/utils'
import {
  APPLICATION_RAIL_STEP,
  APPLICATION_STATUS,
  RAIL_APPLICATION,
} from '@/lib/constants'
import { ToolHeader } from '@/components/ui/tool-header'
import { CaseHeader } from '@/components/ui/case-header'
import { DecisionBar } from '@/components/ui/decision-bar'
import { Toast } from '@/components/ui/toast'
import {
  AdminLayout,
  AiScreeningTab,
  AiSummaryCard,
  DecisionDialog,
  SupplementDialog,
  CompetencyReview,
  CURRENT_ADMIN,
  DecisionCard,
  DocumentsTab,
  HistoryTab,
  ProfileTab,
  DECISION_LABEL,
  DECISION_TOAST,
  formatDate,
  mockApplications,
  useApplicationReview,
  type ReviewDecision,
} from '@/features/admin'

const tabs = [
  { key: 'profile', label: 'Hồ sơ' },
  { key: 'documents', label: 'Tài liệu' },
  { key: 'ai', label: 'AI sàng lọc' },
  { key: 'history', label: 'Lịch sử' },
] as const

// MOCK: badge sidebar đếm từ mock, sau này lấy từ API
const pendingCount = mockApplications.filter(
  (a) => a.status === 'CAPABILITY_REVIEW'
).length

export default function AdminApplicationDetailPage() {
  const { id = '' } = useParams()
  const [tab, setTab] = useState<(typeof tabs)[number]['key']>('ai')
  const [docCode, setDocCode] = useState<string>()
  const [dialog, setDialog] = useState<ReviewDecision | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const clearToast = useCallback(() => setToast(null), [])
  const review = useApplicationReview(id)
  const { detail, decision, status } = review

  const listLink = (
    <Link
      to="/admin/experts/pending"
      className="text-fg-muted hover:text-fg-strong"
    >
      Hồ sơ chờ duyệt
    </Link>
  )

  if (!detail || !status) {
    return (
      <AdminLayout
        section="pending"
        breadcrumb={listLink}
        pendingCount={pendingCount}
      >
        <h1 className="text-h1-tool">Không tìm thấy hồ sơ {id}</h1>
        <Link
          to="/admin/experts/pending"
          className="text-accent-text mt-3 inline-block underline"
        >
          Quay lại danh sách
        </Link>
      </AdminLayout>
    )
  }

  // Tab ARIA: mũi tên trái/phải, Home/End chuyển tab và chuyển focus theo
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

  const finish = (kind: ReviewDecision, note?: string) => {
    review.decide(kind, note)
    setDialog(null)
    setTab('history')
    setToast(DECISION_TOAST[kind])
  }

  const blockers = [
    review.remainingCriteria > 0 && {
      text: `Còn ${review.remainingCriteria} tiêu chí chưa chấm hoặc chưa ghi căn cứ`,
    },
    review.unreviewedFlags > 0 && {
      text: `${review.unreviewedFlags} mục AI cần xem lại chưa được xem xét`,
      tone: 'warning' as const,
    },
  ].filter((b) => !!b)

  const railStep = APPLICATION_RAIL_STEP[status]
  // Bước cuối hiện nhãn trạng thái khi đã có kết quả, vd. "Được duyệt"
  const railSteps = [
    ...RAIL_APPLICATION.slice(0, -1),
    railStep >= RAIL_APPLICATION.length
      ? APPLICATION_STATUS[status].label
      : RAIL_APPLICATION[RAIL_APPLICATION.length - 1],
  ]

  return (
    <AdminLayout
      section="pending"
      pendingCount={pendingCount}
      breadcrumb={
        <>
          {listLink} <span aria-hidden="true">/</span>{' '}
          <span className="text-fg-strong" aria-current="page">
            {detail.name}
          </span>
        </>
      }
    >
      {decision ? (
        <CaseHeader
          code={detail.id}
          title={detail.name}
          meta={[
            ['Chức danh', `${detail.jobTitle}, ${detail.company}`],
            ['Kinh nghiệm', `${detail.years} năm`],
            ['Nộp', formatDate(detail.submittedAt)],
          ]}
          rail={{ steps: railSteps, current: railStep }}
        />
      ) : (
        <ToolHeader
          code={detail.id}
          subtitle={`${detail.name} · ${detail.jobTitle} · ${detail.years} năm`}
          rail={{ steps: railSteps, current: railStep }}
        />
      )}

      <div className="mt-6 grid items-start gap-4 md:gap-6 lg:grid-cols-[minmax(420px,1fr)_340px]">
        {/* ── Left: tabs ── */}
        <div className="min-w-0">
          <div
            role="tablist"
            aria-label="Thông tin hồ sơ"
            onKeyDown={onTabKey}
            className="mb-4 flex gap-7 overflow-x-auto"
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
                  'border-b-2 pb-2 whitespace-nowrap',
                  tab === key
                    ? 'border-indicator text-fg-strong font-semibold'
                    : 'text-fg-muted border-transparent'
                )}
              >
                {label}
              </button>
            ))}
          </div>

          <div
            role="tabpanel"
            id={`panel-${tab}`}
            aria-labelledby={`tab-${tab}`}
          >
            {tab === 'ai' && (
              <AiScreeningTab
                screening={detail.screening}
                reviewedFlags={review.reviewedFlags}
                onToggleReviewed={review.toggleFlagReviewed}
                onRequestSupplement={() => setDialog('supplement')}
              />
            )}
            {tab === 'profile' && (
              <ProfileTab
                detail={detail}
                onOpenDocument={(code) => {
                  setDocCode(code)
                  setTab('documents')
                }}
              />
            )}
            {tab === 'documents' && (
              <DocumentsTab
                documents={detail.documents}
                initialCode={docCode}
                reviewedFlags={review.reviewedFlags}
                onToggleReviewed={review.toggleFlagReviewed}
              />
            )}
            {tab === 'history' && <HistoryTab history={review.history} />}
          </div>
        </div>

        {/* ── Right: chấm điểm, hoặc kết quả sau khi đã quyết định ── */}
        {decision ? (
          <div className="space-y-4 md:space-y-6">
            <DecisionCard
              decision={decision}
              criteria={review.criteria}
              scores={review.scores}
            />
            <AiSummaryCard
              screening={detail.screening}
              flagReviews={review.flagReviews}
              reviewer={CURRENT_ADMIN}
              onOpenDetail={() => setTab('ai')}
            />
          </div>
        ) : (
          <div className="lg:sticky lg:top-20 lg:max-h-[calc(100vh-160px)] lg:overflow-y-auto">
            <CompetencyReview
              criteria={review.criteria}
              scores={review.scores}
              evidence={review.evidence}
              disabled={false}
              onScore={review.setScore}
              onEvidence={review.setEvidence}
            />
          </div>
        )}
      </div>

      {!decision && (
        <DecisionBar
          className="-mx-4 mt-12 -mb-12 md:-mx-6 lg:-mx-8"
          blockers={blockers}
          ready={`Đã chấm và ghi căn cứ đủ ${review.criteria.length}/${review.criteria.length} tiêu chí`}
          secondary={
            <button
              type="button"
              onClick={() => setDialog('supplement')}
              className="btn btn-press btn-secondary"
            >
              {DECISION_LABEL.supplement}
            </button>
          }
          danger={
            <button
              type="button"
              onClick={() => setDialog('reject')}
              className="btn btn-press bg-danger text-paper"
            >
              {DECISION_LABEL.reject}
            </button>
          }
          primary={{
            label: DECISION_LABEL.approve,
            onClick: () => setDialog('approve'),
            disabled: !review.canApprove,
          }}
        />
      )}

      {dialog === 'supplement' && (
        <SupplementDialog
          criteria={review.criteria}
          scores={review.scores}
          evidence={review.evidence}
          flags={detail.screening.flags}
          onCancel={() => setDialog(null)}
          onConfirm={(message) => finish('supplement', message)}
        />
      )}
      {(dialog === 'approve' || dialog === 'reject') && (
        <DecisionDialog
          key={dialog}
          kind={dialog}
          applicantName={detail.name}
          criteria={review.criteria}
          scores={review.scores}
          onCancel={() => setDialog(null)}
          onConfirm={(note) => finish(dialog, note)}
        />
      )}
      {toast && <Toast message={toast} onDone={clearToast} />}
    </AdminLayout>
  )
}
