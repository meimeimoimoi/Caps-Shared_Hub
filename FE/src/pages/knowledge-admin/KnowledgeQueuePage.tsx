import { useCallback, useState } from 'react'
import { Upload } from 'lucide-react'
import { Toast } from '@/components/ui/toast'
import { KnowledgeLayout } from '@/app/layouts/knowledge/KnowledgeLayout'
import { useKnowledgeNav } from '@/app/layouts/knowledge/useKnowledgeNav'
import { DocumentsTable } from '../../features/knowledgeAdmin-review-approval/components/DocumentsTable'
import { UploadDialog } from '../../features/knowledgeAdmin-review-approval/components/UploadDialog'
import { PipelineSteps } from '../../features/knowledgeAdmin-review-approval/components/PipelineSteps'
import { PIPELINE } from '../../features/knowledgeAdmin-review-approval/constants'
import { useReviewQueue } from '../../features/knowledgeAdmin-review-approval/hooks/useReviewQueue'

export default function KnowledgeQueuePage() {
  const queue = useReviewQueue()
  const nav = useKnowledgeNav()
  const [uploadOpen, setUploadOpen] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const clearToast = useCallback(() => setToast(null), [])

  return (
    <KnowledgeLayout
      {...nav}
      section="queue"
      breadcrumb="Hàng đợi duyệt"
      search={queue.query}
      onSearchChange={queue.setQuery}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-h1">Kho tri thức Thuế TNDN</h1>
          <p className="text-fg-muted mt-3">
            Văn bản chỉ được AI/RAG truy vấn sau khi bạn duyệt và index thành
            công. Bấm một bước để xem văn bản đang ở đó.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setUploadOpen(true)}
          className="btn btn-press btn-primary"
        >
          <Upload size={16} aria-hidden="true" />
          Tải tài liệu lên
        </button>
      </div>

      <div className="mt-8">
        <PipelineSteps
          summary={queue.summary}
          selected={queue.stage}
          onSelect={queue.setStage}
        />
      </div>

      <h2 className="text-h2 mt-12">
        {PIPELINE.find((p) => p.key === queue.stage)?.heading}
      </h2>
      <DocumentsTable
        rows={queue.rows}
        empty={queue.isLoading ? 'Đang tải…' : queue.error?.message}
      />

      {uploadOpen && (
        <UploadDialog
          onClose={() => setUploadOpen(false)}
          onUpload={(file, meta, onProgress) =>
            queue
              .upload(file, meta, onProgress)
              .then(() => setToast('Đã tải lên, văn bản đang chờ bóc tách'))
          }
        />
      )}
      {toast && <Toast message={toast} onDone={clearToast} />}
    </KnowledgeLayout>
  )
}
