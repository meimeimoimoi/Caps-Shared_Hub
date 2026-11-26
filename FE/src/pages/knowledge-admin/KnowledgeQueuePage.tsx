import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { EmptyState } from '@/components/ui/feedback/empty-state'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { CircleX, Upload } from 'lucide-react'
import { useNavToast } from '@/hooks/useNavToast'
import { Toast } from '@/components/ui/feedback/toast'
import { KnowledgeLayout } from '@/app/layouts/knowledge/KnowledgeLayout'
import { useKnowledgeNav } from '@/app/layouts/knowledge/useKnowledgeNav'
import { PageHeader } from '@/components/ui/layout/page-header'
import { DocumentsTable } from '../../features/knowledgeAdmin-review-approval/components/DocumentsTable'
import { FailureDrawer } from '../../features/knowledgeAdmin-review-approval/components/FailureDrawer'
import { UploadDialog } from '../../features/knowledgeAdmin-review-approval/components/UploadDialog'
import { PipelineSteps } from '../../features/knowledgeAdmin-review-approval/components/PipelineSteps'
import {
  PIPELINE,
  type QueueFilter,
} from '../../features/knowledgeAdmin-review-approval/constants'
import { useReviewQueue } from '../../features/knowledgeAdmin-review-approval/hooks/useReviewQueue'

const FILTERS = [...PIPELINE.map((p) => p.key), 'failed'] as const

export default function KnowledgeQueuePage() {
  const { t } = useTranslation('knowledge')
  // Bộ lọc nằm trên URL (?stage=) để chuông thông báo và nút Back dẫn đúng chỗ
  const [params, setParams] = useSearchParams()
  const raw = params.get('stage')
  const stage: QueueFilter = FILTERS.includes(raw as QueueFilter)
    ? (raw as QueueFilter)
    : 'review'
  const setStage = (s: QueueFilter) =>
    setParams(s === 'review' ? {} : { stage: s })

  const queue = useReviewQueue(stage)
  const navigate = useNavigate()
  const nav = useKnowledgeNav()
  const [uploadOpen, setUploadOpen] = useState(false)
  const [openId, setOpenId] = useState<string | null>(null)
  // Màn khác điều hướng về kèm { toast } (vd. sau khi duyệt phiên bản)
  const { toast, setToast, clearToast } = useNavToast()

  const failedCount =
    (queue.summary?.indexFailed ?? 0) + (queue.summary?.parseFailed ?? 0)
  const failed = stage === 'failed'
  const openDoc = queue.rows.find((d) => d.id === openId)

  return (
    <KnowledgeLayout
      {...nav}
      section="queue"
      breadcrumb={
        failed ? (
          <>
            <Link
              to="/knowledge/queue"
              className="text-fg-muted hover:text-fg-strong"
            >
              Hàng đợi duyệt
            </Link>{' '}
            <span aria-hidden="true">/</span>{' '}
            <span className="text-fg-strong" aria-current="page">
              Lỗi
            </span>
          </>
        ) : (
          'Hàng đợi duyệt'
        )
      }
      search={queue.query}
      onSearchChange={queue.setQuery}
    >
      <PageHeader
        title="Hàng đợi duyệt"
        help="Văn bản chỉ được AI/RAG truy vấn sau khi bạn duyệt và index thành công. Bấm một bước để xem văn bản đang ở đó."
        actions={
          <>
            {/* Lối vào lại trang kết quả; trước đây chỉ tới được ngay sau khi tải lên */}
            <Link
              to="/knowledge/uploads"
              className="btn btn-press btn-secondary no-underline"
            >
              Kết quả tải lên
            </Link>
            <button
              type="button"
              onClick={() => setUploadOpen(true)}
              className="btn btn-press btn-primary"
            >
              <Upload size={16} aria-hidden="true" />
              Tải tài liệu lên
            </button>
          </>
        }
      />

      <div className="mt-8">
        <PipelineSteps
          summary={queue.summary}
          selected={stage}
          onSelect={setStage}
        />
      </div>

      {/* Đậm hơn danger-soft (~7%) một bậc: 16% màu danger trên nền giấy; chữ xám vẫn 5.4:1 (sáng) / 5.7:1 (tối) */}
      {failedCount > 0 && !failed && (
        <div className="rounded-surface mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 bg-[color-mix(in_oklab,var(--color-danger)_16%,var(--color-paper))] px-4 py-3 text-sm">
          <CircleX
            size={16}
            aria-hidden="true"
            className="text-danger shrink-0"
          />
          <span className="text-fg-strong font-semibold">
            <span className="num">{failedCount}</span> văn bản lỗi cần xử lý
          </span>
          <span className="text-fg-muted">
            AI/RAG chưa dùng được các văn bản này.
          </span>
          <button
            type="button"
            onClick={() => setStage('failed')}
            className="text-fg-strong ml-auto font-semibold underline underline-offset-4"
          >
            Xem văn bản lỗi
          </button>
        </div>
      )}

      <h2 className="text-h2 mt-12">
        {failed
          ? 'Văn bản lỗi'
          : PIPELINE.find((p) => p.key === stage)?.heading}
      </h2>
      <DocumentsTable
        rows={queue.rows}
        // Tab Thu thập gồm văn bản ở mọi bước: hiện cột trạng thái để biết văn bản nào đang chờ duyệt
        showStage={failed || stage === 'collect'}
        // Văn bản lỗi: mở ngăn kéo chi tiết lỗi thay vì chuyển trang
        onOpen={failed ? (d) => setOpenId(d.id) : undefined}
        loading={queue.isLoading}
        empty={
          queue.error?.message ?? (
            <EmptyState
              title={t(
                queue.query.trim() && queue.total > 0
                  ? 'empty.search'
                  : failed
                    ? 'empty.failed'
                    : 'empty.queue'
              )}
              actions={
                queue.query.trim() && queue.total > 0 ? (
                  <button
                    type="button"
                    onClick={() => queue.setQuery('')}
                    className="btn btn-secondary"
                  >
                    {t('actions.clearSearch')}
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => setUploadOpen(true)}
                      className="btn btn-primary"
                    >
                      {t('actions.upload')}
                    </button>
                    <Link
                      to="/knowledge/sources"
                      className="btn btn-secondary no-underline"
                    >
                      {t('actions.sources')}
                    </Link>
                    {stage !== 'collect' && (
                      <Link
                        to="/knowledge/documents"
                        className="btn btn-secondary no-underline"
                      >
                        {t('actions.allDocuments')}
                      </Link>
                    )}
                  </>
                )
              }
            />
          )
        }
      />

      {openDoc?.failure && (
        <FailureDrawer
          doc={{ ...openDoc, failure: openDoc.failure }}
          onClose={() => setOpenId(null)}
          onRetry={() =>
            queue.retry(openDoc.id).then(() => {
              setOpenId(null)
              setToast(`Đang thử lại ${openDoc.number}`)
            })
          }
        />
      )}
      {uploadOpen && (
        <UploadDialog
          onClose={() => setUploadOpen(false)}
          onUpload={(file, meta, onProgress) =>
            queue.upload(file, meta, onProgress).then(() =>
              navigate('/knowledge/uploads', {
                state: { toast: `Đã tải lên ${file.name}` },
              })
            )
          }
        />
      )}
      {toast && <Toast message={toast} onDone={clearToast} />}
    </KnowledgeLayout>
  )
}
