import { useCallback, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Eye, Info } from 'lucide-react'
import { RAIL_DOCUMENT } from '@/lib/constants'
import { DecisionBar } from '@/components/ui/actions/decision-bar'
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

const queueLink = (
  <Link to="/knowledge/queue" className="text-fg-muted hover:text-fg-strong">
    Hàng đợi duyệt
  </Link>
)
const CHECK_TOTAL = Object.keys(CROSSCHECK).length

export default function KnowledgeReviewPage() {
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
      ) : (
        <h1 className="text-h1-tool">
          {state.isLoading
            ? 'Đang tải…'
            : (state.error?.message ?? 'Văn bản chưa có nội dung bóc tách')}
        </h1>
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
  const [checked, setChecked] = useState<CrosscheckKey[]>([])
  const [meta, setMeta] = useState(review.meta)
  const [rejecting, setRejecting] = useState(false)
  const [busy, setBusy] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const clearToast = useCallback(() => setToast(null), [])

  const article = articles.find((a) => a.id === selectedId)
  const chapter = review.chapters.find((c) =>
    c.articles.some((a) => a.id === selectedId)
  )
  const fail = (e: Error) => setToast(e.message)

  // Điều chưa rà soát tiếp theo, tính vòng từ Điều đang mở
  const goNext = () => {
    const i = articles.findIndex((a) => a.id === selectedId)
    const next = [...articles.slice(i + 1), ...articles.slice(0, i)].find(
      (a) => articleStatus(a) !== 'REVIEWED'
    )
    if (next) setSelectedId(next.id)
    else setToast('Đã rà soát hết các Điều')
  }

  const select = (id: string) => {
    setEditing(false)
    setEdits({})
    setSelectedId(id)
  }

  const total = articles.length
  const metaMissing = Object.values(meta).some((v) => !v.trim())
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
            <a
              href={review.sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="btn btn-ghost no-underline"
            >
              <Eye size={16} aria-hidden="true" />
              Bản gốc
            </a>
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
            <CrosscheckPanel
              checked={checked}
              onToggle={(k) =>
                setChecked((c) =>
                  c.includes(k) ? c.filter((x) => x !== k) : [...c, k]
                )
              }
            />
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
        primary={{
          label: busy ? 'Đang duyệt…' : 'Duyệt và index',
          disabled: blockers.length > 0 || busy,
          onClick: () => {
            setBusy(true)
            state
              .approve({ meta, crosscheck: checked })
              .then(() =>
                navigate(`/knowledge/documents/${review.documentId}`, {
                  state: { toast: `Đã duyệt ${meta.number}, đang index` },
                })
              )
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
            state.reject(reason).then(() =>
              navigate('/knowledge/queue', {
                state: { toast: `Đã từ chối ${review.meta.number}` },
              })
            )
          }
        />
      )}
      {toast && <Toast message={toast} onDone={clearToast} />}
    </>
  )
}
