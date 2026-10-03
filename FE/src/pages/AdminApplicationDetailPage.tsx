import { useState, type KeyboardEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { APPLICATION_RAIL_STEP, RAIL_APPLICATION } from '@/lib/constants'
import { ToolHeader } from '@/components/ui/tool-header'
import { DecisionBar } from '@/components/ui/decision-bar'
import {
  AdminLayout,
  AiScreeningTab,
  CompetencyReview,
  DocumentsTab,
  ProfileTab,
  DECISION_LABEL,
  formatDateTime,
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
  const review = useApplicationReview(id)
  const { detail, decision } = review

  const listLink = (
    <Link
      to="/admin/experts/pending"
      className="text-fg-muted hover:text-fg-strong"
    >
      Hồ sơ chờ duyệt
    </Link>
  )

  if (!detail) {
    return (
      <AdminLayout breadcrumb={listLink} pendingCount={pendingCount}>
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

  const decide = (d: ReviewDecision) => {
    if (window.confirm(`${DECISION_LABEL[d]} hồ sơ ${detail.id}?`))
      review.decide(d)
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

  return (
    <AdminLayout
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
      <ToolHeader
        code={detail.id}
        subtitle={`${detail.name} · ${detail.jobTitle} · ${detail.years} năm`}
        rail={{
          steps: RAIL_APPLICATION,
          current: APPLICATION_RAIL_STEP[detail.status],
        }}
      />

      {decision && (
        <p
          role="status"
          className="bg-success-soft text-success rounded-surface mt-6 px-4 py-3"
        >
          Đã ghi nhận quyết định: {DECISION_LABEL[decision]}.
        </p>
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
                onRequestSupplement={() => decide('supplement')}
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
            {tab === 'history' && (
              <ol className="paper space-y-3 p-5 md:p-6">
                {detail.history.map((h, i) => (
                  <li key={i} className="flex gap-4">
                    <span className="text-fg-muted num w-36 shrink-0">
                      {formatDateTime(h.at)}
                    </span>
                    {h.text}
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>

        {/* ── Right: competency ── */}
        <div className="lg:sticky lg:top-20 lg:max-h-[calc(100vh-160px)] lg:overflow-y-auto">
          <CompetencyReview
            criteria={review.criteria}
            scores={review.scores}
            evidence={review.evidence}
            disabled={!!decision}
            onScore={review.setScore}
            onEvidence={review.setEvidence}
          />
        </div>
      </div>

      <DecisionBar
        className="-mx-4 mt-12 -mb-12 md:-mx-6 lg:-mx-8"
        blockers={blockers}
        ready={`Đã chấm và ghi căn cứ đủ ${review.criteria.length}/${review.criteria.length} tiêu chí`}
        secondary={
          <button
            type="button"
            disabled={!!decision}
            onClick={() => decide('supplement')}
            className="btn btn-press btn-secondary"
          >
            {DECISION_LABEL.supplement}
          </button>
        }
        danger={
          <button
            type="button"
            disabled={!!decision}
            onClick={() => decide('reject')}
            className="btn btn-press bg-danger text-paper disabled:bg-desk-2 disabled:text-fg-disabled"
          >
            {DECISION_LABEL.reject}
          </button>
        }
        primary={{
          label: DECISION_LABEL.approve,
          onClick: () => decide('approve'),
          disabled: !review.canApprove,
        }}
      />
    </AdminLayout>
  )
}
