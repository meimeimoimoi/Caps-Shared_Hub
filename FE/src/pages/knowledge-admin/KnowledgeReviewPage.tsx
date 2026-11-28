import {
  errorToast,
  type ToastContent,
} from '@/components/ui/feedback/toast-content'
import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { EmptyState } from '@/components/ui/feedback/empty-state'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Eye, Info } from 'lucide-react'
import { RAIL_DOCUMENT } from '@/lib/constants'
import { DecisionBar } from '@/components/ui/actions/decision-bar'
import { Modal } from '@/components/ui/feedback/modal'
import { Toast } from '@/components/ui/feedback/toast'
import { ToolHeader } from '@/components/ui/layout/tool-header'
import { KnowledgeLayout } from '@/app/layouts/knowledge/KnowledgeLayout'
import { useKnowledgeNav } from '@/app/layouts/knowledge/useKnowledgeNav'
import { ArticleContent } from '../../features/knowledgeAdmin-review-approval/components/ArticleContent'
import { CrosscheckPanel } from '../../features/knowledgeAdmin-review-approval/components/CrosscheckPanel'
import { MetaFields } from '../../features/knowledgeAdmin-review-approval/components/MetaFields'
import { RejectDialog } from '../../features/knowledgeAdmin-review-approval/components/RejectDialog'
import { StructureTree } from '../../features/knowledgeAdmin-review-approval/components/StructureTree'
import {
  CROSSCHECK,
  type CrosscheckKey,
} from '../../features/knowledgeAdmin-review-approval/constants'
import { useDocumentReview } from '../../features/knowledgeAdmin-review-approval/hooks/useDocumentReview'
import type { DocumentReview } from '../../features/knowledgeAdmin-review-approval/types'
import { articleStatus } from '../../features/knowledgeAdmin-review-approval/utils/review'
import { openOriginal } from '../../features/knowledgeAdmin-review-approval/utils/openOriginal'
import {
  loadCrosscheck,
  saveCrosscheck,
} from '../../features/knowledgeAdmin-review-approval/utils/crosscheckDraft'

const queueLink = (
  <Link to="/knowledge/queue" className="text-fg-muted hover:text-fg-strong">
    Hàng đợi duyệt
  </Link>
)
const CHECK_TOTAL = Object.keys(CROSSCHECK).length

export default function KnowledgeReviewPage() {
  const { t } = useTranslation(['knowledge', 'common'])
  const { id = '' } = useParams()
  const nav = useKnowledgeNav()
  const state = useDocumentReview(id)
  const { review } = state

  return (
    <KnowledgeLayout
      {...nav}
      section="queue"
      title={review ? `Rà soát ${review.meta.number}` : undefined}
      breadcrumb={
        <>
          {queueLink}
          {review && (
            <>
              {' '}
              <span aria-hidden="true">/</span>{' '}
              <span className="text-fg-strong num" aria-current="page">
                {review.meta.number}
              </span>
            </>
          )}
        </>
      }
    >
      {review ? (
        <ReviewWorkspace review={review} state={state} />
      ) : state.isLoading ? (
        <p role="status">{t('common:loading')}</p>
      ) : (
        <EmptyState
          title={t('errors.review')}
          actions={
            <Link
              to="/knowledge/queue"
              className="btn btn-secondary no-underline"
            >
              {t('actions.backQueue')}
            </Link>
          }
        >
          <p role={state.error ? 'alert' : undefined}>
            {state.error?.message ?? t('errors.reviewMissing')}
          </p>
        </EmptyState>
      )}
    </KnowledgeLayout>
  )
}

/* Tách riêng để state (metadata, checklist) khởi tạo từ dữ liệu đã tải */
function ReviewWorkspace({
  review,
  state,
}: {
  review: DocumentReview
  state: ReturnType<typeof useDocumentReview>
}) {
  const navigate = useNavigate()
  const { articles, reviewedArticles, warnings } = state
  const [selectedId, setSelectedId] = useState(
    () =>
      articles.find((a) => articleStatus(a) !== 'REVIEWED')?.id ??
      articles[0]?.id
  )
  const [editing, setEditing] = useState(false)
  const [edits, setEdits] = useState<Record<string, string>>({})
  const [checked, setChecked] = useState<CrosscheckKey[]>(() =>
    loadCrosscheck(review.documentId)
  )
  // Article the admin asked to open while unsaved edits are pending
  const [leaving, setLeaving] = useState<string | null>(null)
  const [meta, setMeta] = useState(review.meta)
  const [rejecting, setRejecting] = useState(false)
  const [reprocessing, setReprocessing] = useState(false)
  const [busy, setBusy] = useState(false)
  const [toast, setToast] = useState<ToastContent | null>(null)
  const clearToast = useCallback(() => setToast(null), [])

  const article = articles.find((a) => a.id === selectedId)
  const chapter = review.chapters.find((c) =>
    c.articles.some((a) => a.id === selectedId)
  )
  const fail = (e: Error) => setToast(errorToast(e.message))

  // Điều chưa rà soát tiếp theo, tính vòng từ Điều đang mở
  const goNext = () => {
    const i = articles.findIndex((a) => a.id === selectedId)
    const next = [...articles.slice(i + 1), ...articles.slice(0, i)].find(
      (a) => articleStatus(a) !== 'REVIEWED'
    )
    if (next) select(next.id)
    else setToast('Đã rà soát hết các Điều')
  }

  const open = (id: string) => {
    setEditing(false)
    setEdits({})
    setSelectedId(id)
  }
  // Switching article drops the edit buffer, so ask first when it holds changes
  const select = (id: string) => {
    if (id === selectedId) return
    if (editing && Object.keys(edits).length) setLeaving(id)
    else open(id)
  }
  const toggleCheck = (k: CrosscheckKey) =>
    setChecked((c) => {
      const next = c.includes(k) ? c.filter((x) => x !== k) : [...c, k]
      saveCrosscheck(review.documentId, next)
      return next
    })
  // A decided document needs no saved ticks
  const done = () => saveCrosscheck(review.documentId, [])

  const total = articles.length
  const metaMissing = Object.values(meta).some((v) => !v?.trim())
  const blockers = [
    warnings > 0 && {
      text: `${warnings} mục cần kiểm tra chưa xử lý`,
      tone: 'warning' as const,
    },
    reviewedArticles < total && {
      text: `${total - reviewedArticles}/${total} Điều chưa rà soát`,
    },
    checked.length < CHECK_TOTAL && {
      text: `Đối chiếu ${checked.length}/${CHECK_TOTAL} mục`,
    },
    metaMissing && { text: 'Metadata còn trống' },
  ].filter((b) => !!b)

  return (
    <>
      <ToolHeader
        code={review.meta.number}
        subtitle={review.title}
        rail={{ steps: RAIL_DOCUMENT, current: 3 }}
      />

      <div className="mt-6 grid items-start gap-4 lg:grid-cols-[220px_minmax(0,1fr)_300px] lg:gap-6">
        <div className="lg:sticky lg:top-20 lg:max-h-[calc(100vh-180px)] lg:overflow-y-auto">
          <StructureTree
            chapters={review.chapters}
            selectedId={selectedId}
            onSelect={select}
          />
        </div>

        <section className="paper min-w-0 p-5 md:p-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-fg-strong font-semibold">
              Nội dung đã bóc tách
            </h2>
            <p className="text-fg-muted text-sm">
              <span className="num">
                {reviewedArticles}/{total}
              </span>{' '}
              Điều đã rà soát · <span className="num">{warnings}</span> mục cần
              kiểm tra
            </p>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={goNext}
              className="btn btn-press btn-secondary"
            >
              Mục chưa rà soát tiếp theo
            </button>
            <button
              type="button"
              disabled={!review.sourceUrl}
              onClick={() => openOriginal(review.sourceUrl).catch(fail)}
              className="btn btn-ghost"
            >
              <Eye size={16} aria-hidden="true" />
              Bản gốc
            </button>
            {editing ? (
              <>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    setBusy(true)
                    state
                      .saveEdits(edits)
                      .then(() => {
                        setEditing(false)
                        setEdits({})
                        setToast('Đã lưu đoạn đã sửa')
                      })
                      .catch(fail)
                      .finally(() => setBusy(false))
                  }}
                  className="btn btn-press btn-primary"
                >
                  Lưu
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditing(false)
                    setEdits({})
                  }}
                  className="btn btn-ghost"
                >
                  Hủy
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="btn btn-ghost"
              >
                Sửa đoạn
              </button>
            )}
          </div>

          <div className="bg-sunken rounded-surface mt-5 flex gap-2 p-3 text-sm">
            <Info size={16} aria-hidden="true" className="mt-0.5 shrink-0" />
            <div>
              <p className="text-fg-strong font-semibold">
                Nội dung bóc tách tự động, chưa được rà soát đầy đủ
              </p>
              <p className="text-fg-muted">
                Đối chiếu với văn bản gốc trước khi duyệt. Sau khi duyệt, nội
                dung này được chia đoạn và index cho AI/RAG.
              </p>
            </div>
          </div>

          {chapter && (
            <p className="text-fg-muted mt-5 text-sm">{chapter.title}</p>
          )}
          {article && (
            <div className="mt-3">
              <ArticleContent
                article={article}
                editing={editing}
                edits={edits}
                onEdit={(unitId, text) =>
                  setEdits((e) => ({ ...e, [unitId]: text }))
                }
                onMarkReviewed={(unitId) =>
                  state.markReviewed(unitId).catch(fail)
                }
              />
            </div>
          )}
        </section>

        <div className="space-y-4 lg:sticky lg:top-20 lg:max-h-[calc(100vh-180px)] lg:overflow-y-auto">
          <section className="paper p-5">
            <CrosscheckPanel checked={checked} onToggle={toggleCheck} />
          </section>
          <section className="paper p-5">
            <h2 className="text-h2 mb-4">Metadata</h2>
            <MetaFields value={meta} onChange={setMeta} narrow />
          </section>
        </div>
      </div>

      <DecisionBar
        className="-mx-4 mt-12 -mb-12 md:-mx-6 lg:-mx-8"
        blockers={blockers}
        ready={`Đã rà soát ${total}/${total} Điều và đối chiếu đủ ${CHECK_TOTAL} mục`}
        danger={
          <button
            type="button"
            onClick={() => setRejecting(true)}
            className="btn btn-press bg-danger text-paper"
          >
            Từ chối
          </button>
        }
        secondary={
          <button
            type="button"
            onClick={() => setReprocessing(true)}
            className="btn btn-press btn-secondary"
          >
            Yêu cầu bóc tách lại
          </button>
        }
        primary={{
          label: busy ? 'Đang duyệt…' : 'Duyệt và index',
          disabled: blockers.length > 0 || busy,
          onClick: () => {
            setBusy(true)
            state
              .approve({ meta, crosscheck: checked })
              .then(() => {
                done()
                navigate(`/knowledge/documents/${review.documentId}`, {
                  state: { toast: `Đã duyệt ${meta.number}, đang index` },
                })
              })
              .catch((e: Error) => {
                setBusy(false)
                fail(e)
              })
          },
        }}
      />

      {rejecting && (
        <RejectDialog
          title={`Từ chối ${review.meta.number}?`}
          description="Văn bản bị loại khỏi hàng đợi và không được dùng cho AI/RAG."
          confirmLabel="Từ chối văn bản"
          onClose={() => setRejecting(false)}
          onConfirm={(reason) =>
            state.reject(reason).then(() => {
              done()
              navigate('/knowledge/queue', {
                state: { toast: `Đã từ chối ${review.meta.number}` },
              })
            })
          }
        />
      )}
      {reprocessing && (
        <RejectDialog
          title={`Bóc tách lại ${review.meta.number}?`}
          description="Văn bản quay về bước bóc tách. Bóc tách xong, văn bản trở lại hàng đợi Chờ duyệt để rà soát lại."
          confirmLabel="Yêu cầu bóc tách lại"
          reasonLabel="Lý do bóc tách lại (bắt buộc)"
          onClose={() => setReprocessing(false)}
          onConfirm={(reason) =>
            state.reprocess(reason).then(() => {
              done()
              navigate('/knowledge/queue', {
                state: {
                  toast: `Đã gửi ${review.meta.number} về bước bóc tách`,
                },
              })
            })
          }
        />
      )}
      {leaving && (
        <Modal
          title="Bỏ đoạn đã sửa chưa lưu?"
          description={`Chuyển sang Điều khác sẽ mất ${Object.keys(edits).length} đoạn đã sửa nhưng chưa lưu.`}
          onClose={() => setLeaving(null)}
          footer={
            <>
              <button
                type="button"
                onClick={() => setLeaving(null)}
                className="btn btn-press btn-secondary"
              >
                Ở lại sửa tiếp
              </button>
              <button
                type="button"
                onClick={() => {
                  open(leaving)
                  setLeaving(null)
                }}
                className="btn btn-press bg-danger text-paper"
              >
                Bỏ thay đổi
              </button>
            </>
          }
        />
      )}
      {toast && <Toast message={toast} onDone={clearToast} />}
    </>
  )
}
