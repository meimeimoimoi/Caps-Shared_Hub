import { KnowledgeLayout } from '@/app/layouts/knowledge/KnowledgeLayout'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { EmptyState } from '@/components/ui/feedback/empty-state'
import { useKnowledgeNav } from '@/app/layouts/knowledge/useKnowledgeNav'
import { DocumentsTable } from '../../features/knowledgeAdmin-review-approval/components/DocumentsTable'
import { UploadDialog } from '../../features/knowledgeAdmin-review-approval/components/UploadDialog'
import { useReviewQueue } from '../../features/knowledgeAdmin-review-approval/hooks/useReviewQueue'

export default function KnowledgeDocumentsPage() {
  const { t } = useTranslation('knowledge')
  const [uploadOpen, setUploadOpen] = useState(false)
  const navigate = useNavigate()
  const nav = useKnowledgeNav()
  const docs = useReviewQueue('collect') // 'collect' includes every document.

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
          loading={docs.isLoading}
          empty={
            docs.error?.message ?? (
              <EmptyState
                title={t(
                  docs.query.trim() && docs.total > 0
                    ? 'empty.search'
                    : 'empty.documents'
                )}
                actions={
                  docs.query.trim() && docs.total > 0 ? (
                    <button
                      type="button"
                      onClick={() => docs.setQuery('')}
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
                    </>
                  )
                }
              />
            )
          }
        />
      </div>
      {uploadOpen && (
        <UploadDialog
          onClose={() => setUploadOpen(false)}
          onUpload={(file, meta, onProgress) =>
            docs.upload(file, meta, onProgress).then(() =>
              navigate('/knowledge/uploads', {
                state: { toast: `Đã tải lên ${file.name}` },
              })
            )
          }
        />
      )}
    </KnowledgeLayout>
  )
}
