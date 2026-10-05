import { useCallback, useState } from 'react'
import { Upload } from 'lucide-react'
import { Toast } from '@/components/ui/toast'
import { KnowledgeLayout } from '@/app/layouts/knowledge/KnowledgeLayout'
import { DocumentsTable } from '../../features/knowledgeAdmin-review-approval/components/DocumentsTable'
import { PipelineSteps } from '../../features/knowledgeAdmin-review-approval/components/PipelineSteps'
import { PIPELINE } from '../../features/knowledgeAdmin-review-approval/constants'
import { useReviewQueue } from '../../features/knowledgeAdmin-review-approval/hooks/useReviewQueue'

export default function KnowledgeQueuePage() {
  const queue = useReviewQueue()
  const [toast, setToast] = useState<string | null>(null)
  const clearToast = useCallback(() => setToast(null), [])

  return (
    <KnowledgeLayout
      section="queue"
      queueCount={queue.summary?.pending ?? 0}
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
        {/* Nút mở hộp chọn file gốc của trình duyệt */}
        <label className="btn btn-press btn-primary cursor-pointer focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-(--focus-ring)">
          <Upload size={16} aria-hidden="true" />
          Tải tài liệu lên
          <input
            type="file"
            multiple
            accept=".pdf,.doc,.docx"
            className="sr-only"
            onChange={(e) => {
              const files = [...(e.target.files ?? [])]
              e.target.value = '' // cho phép chọn lại cùng file
              if (!files.length) return
              queue
                .upload(files)
                .then(() =>
                  setToast(`Đã tải lên ${files.length} văn bản, đang chờ bóc tách`)
                )
                .catch((err: Error) => setToast(err.message))
            }}
          />
        </label>
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

      {toast && <Toast message={toast} onDone={clearToast} />}
    </KnowledgeLayout>
  )
}
