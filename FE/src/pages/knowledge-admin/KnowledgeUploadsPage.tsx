import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Info, Upload } from 'lucide-react'
import { useNavToast } from '@/hooks/useNavToast'
import { StatusBadge } from '@/components/ui/display/status-badge'
import { Toast } from '@/components/ui/feedback/toast'
import { KnowledgeLayout } from '@/app/layouts/knowledge/KnowledgeLayout'
import { useKnowledgeNav } from '@/app/layouts/knowledge/useKnowledgeNav'
import { UploadDialog } from '../../features/knowledgeAdmin-review-approval/components/UploadDialog'
import { UPLOAD_RESULT } from '../../features/knowledgeAdmin-review-approval/constants'
import { useUploads } from '../../features/knowledgeAdmin-review-approval/hooks/useUploads'
import type { UploadResult } from '../../features/knowledgeAdmin-review-approval/types'

const actionCls = 'btn btn-press btn-secondary h-9 px-3 text-sm no-underline'

export default function KnowledgeUploadsPage() {
  const nav = useKnowledgeNav()
  const { uploads, isLoading, error, upload } = useUploads()
  const [uploadOpen, setUploadOpen] = useState(false)
  // Hàng đợi chuyển sang đây sau khi tải lên, kèm { toast }
  const { toast, setToast, clearToast } = useNavToast()

  /* Việc tiếp theo cho từng kết quả; trùng hoàn toàn thì không cần làm gì */
  const action = (u: UploadResult) => {
    if (u.result === 'QUEUED' && u.documentId)
      return (
        <Link
          to={`/knowledge/documents/${u.documentId}/review`}
          className={actionCls}
        >
          Rà soát
        </Link>
      )
    if (u.result === 'NEW_VERSION' && u.documentId)
      return (
        <Link
          to={`/knowledge/documents/${u.documentId}/compare`}
          className={actionCls}
        >
          So sánh phiên bản
        </Link>
      )
    if (u.result === 'PARSE_FAILED' || u.result === 'FILE_INVALID')
      return (
        <button
          type="button"
          onClick={() => setUploadOpen(true)}
          aria-label={`Tải lại ${u.fileName}`}
          className={actionCls}
        >
          Tải lại
        </button>
      )
    return null
  }

  return (
    <KnowledgeLayout
      {...nav}
      section="queue"
      title="Kết quả tải lên"
      breadcrumb={
        <>
          <Link
            to="/knowledge/queue"
            className="text-fg-muted hover:text-fg-strong"
          >
            Hàng đợi duyệt
          </Link>{' '}
          <span aria-hidden="true">/</span>{' '}
          <span className="text-fg-strong" aria-current="page">
            Kết quả tải lên
          </span>
        </>
      }
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-h1">Kết quả tải lên</h1>
          <p className="text-fg-muted mt-3">
            Hệ thống tự kiểm tra định dạng, trùng phiên bản và bóc tách. Bạn chỉ
            cần đọc kết quả và xử lý dòng có lỗi.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setUploadOpen(true)}
          className="btn btn-press btn-primary"
        >
          <Upload size={16} aria-hidden="true" />
          Tải văn bản lên
        </button>
      </div>

      <section className="paper mt-8 overflow-x-auto">
        <table className="w-full min-w-200 text-sm">
          <thead className="bg-sunken text-fg-muted">
            <tr className="[&>th]:px-4 [&>th]:py-3 [&>th]:font-semibold">
              <th className="text-left">Tệp</th>
              <th className="text-left">Kết quả</th>
              <th className="text-left">Việc cần làm</th>
              <th>
                <span className="sr-only">Thao tác</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {uploads.map((u) => (
              <tr
                key={u.id}
                className="border-border-subtle border-t align-top [&>td]:px-4 [&>td]:py-3"
              >
                <td>
                  <div className="text-fg-strong font-semibold break-all">
                    {u.fileName}
                  </div>
                  <div className="text-fg-muted num">{u.number ?? '—'}</div>
                </td>
                <td className="whitespace-nowrap">
                  <StatusBadge status={UPLOAD_RESULT[u.result]} />
                </td>
                <td className="text-fg max-w-[48ch]">
                  {UPLOAD_RESULT[u.result].todo}
                </td>
                <td className="text-right whitespace-nowrap">{action(u)}</td>
              </tr>
            ))}
            {uploads.length === 0 && (
              <tr className="border-border-subtle border-t">
                <td
                  colSpan={4}
                  className="text-fg-muted px-4 py-10 text-center"
                >
                  {isLoading
                    ? 'Đang tải…'
                    : (error?.message ?? 'Chưa có lần tải lên nào.')}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      <div className="bg-sunken rounded-surface mt-6 flex gap-2 p-3 text-sm">
        <Info size={16} aria-hidden="true" className="mt-0.5 shrink-0" />
        <div>
          <p className="text-fg-strong font-semibold">
            Mỗi văn bản chỉ cần tải lên một lần
          </p>
          <p className="text-fg-muted">
            Khi tải văn bản sửa đổi, nên tải thêm văn bản gốc nếu kho chưa có,
            để trích dẫn được đầy đủ.
          </p>
        </div>
      </div>

      {uploadOpen && (
        <UploadDialog
          onClose={() => setUploadOpen(false)}
          onUpload={(file, meta, onProgress) =>
            upload(file, meta, onProgress).then(() =>
              setToast(`Đã tải lên ${file.name}`)
            )
          }
        />
      )}
      {toast && <Toast message={toast} onDone={clearToast} />}
    </KnowledgeLayout>
  )
}
