import { KnowledgeLayout } from '@/app/layouts/knowledge/KnowledgeLayout'
import { useKnowledgeNav } from '@/app/layouts/knowledge/useKnowledgeNav'
import { DocumentsTable } from '../../features/knowledgeAdmin-review-approval/components/DocumentsTable'
import { useReviewQueue } from '../../features/knowledgeAdmin-review-approval/hooks/useReviewQueue'

export default function KnowledgeDocumentsPage() {
  const nav = useKnowledgeNav()
  const docs = useReviewQueue('collect')

  return (
    <KnowledgeLayout
      {...nav}
      section="documents"
      breadcrumb="Tất cả văn bản"
      search={docs.query}
      onSearchChange={docs.setQuery}
    >
      <h1 className="text-h1">Tất cả văn bản</h1>
      <p className="text-fg-muted mt-3">
        Mọi văn bản trong kho tri thức, ở bất kỳ bước nào. Bấm số hiệu để xem
        phiên bản, đoạn đã index và trạng thái AI/RAG.
      </p>

      <div className="mt-8">
        <DocumentsTable
          rows={docs.rows}
          showStage
          linkTo={(d) => `/knowledge/documents/${d.id}`}
          empty={docs.isLoading ? 'Đang tải…' : docs.error?.message}
        />
      </div>
    </KnowledgeLayout>
  )
}
