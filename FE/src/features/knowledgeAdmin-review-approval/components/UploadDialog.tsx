import { useState } from 'react'
import { FileText, Info, Upload, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Modal } from '@/components/ui/feedback/modal'
import { MetaFields } from './MetaFields'
import type { UploadMeta } from '../types'

interface UploadDialogProps {
  onClose: () => void
  onUpload: (
    file: File,
    meta: UploadMeta,
    onProgress: (percent: number) => void
  ) => Promise<void>
}

const ACCEPT = '.pdf,.docx'

const emptyMeta: UploadMeta = {
  number: '',
  docType: '',
  issuer: '',
  issuedAt: '',
  effectiveAt: '',
}

/* Dialog "Tải văn bản lên": 1 file + thông tin văn bản; báo lỗi qua onUpload reject */
export function UploadDialog({ onClose, onUpload }: UploadDialogProps) {
  const [file, setFile] = useState<File | null>(null)
  const [meta, setMeta] = useState(emptyMeta)
  const [progress, setProgress] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const uploading = progress !== null

  // Kéo thả bỏ qua `accept` của input nên kiểm tra đuôi file tại đây
  const pick = (f?: File) => {
    if (!f) return
    if (!/\.(pdf|docx)$/i.test(f.name))
      return setError('Chỉ nhận PDF hoặc DOCX.')
    setError(null)
    setFile(f)
  }

  return (
    <Modal
      title="Tải văn bản lên"
      onClose={onClose}
      // `required` trên các ô nhập đã chặn submit khi thiếu
      onSubmit={() => {
        if (!file) return setError('Chọn một file để tải lên.')
        setProgress(0)
        onUpload(file, meta, setProgress)
          .then(onClose)
          .catch((e: Error) => {
            setProgress(null)
            setError(e.message)
          })
      }}
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="btn btn-press btn-secondary"
          >
            Hủy
          </button>
          <button
            type="submit"
            disabled={uploading}
            className="btn btn-press btn-primary"
          >
            {uploading ? 'Đang tải lên…' : 'Tải lên'}
          </button>
        </>
      }
    >
      <p className="text-fg-muted -mt-1 text-sm">
        PDF hoặc DOCX gốc, ưu tiên tải từ vbpl.vn.
      </p>

      <fieldset disabled={uploading} className="mt-4 space-y-4">
        {file ? (
          <div className="border-border rounded-control flex items-center gap-3 border p-3 text-sm">
            <FileText size={18} aria-hidden="true" className="shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-fg-strong truncate font-semibold">
                {file.name}
              </p>
              <p className="text-fg-muted num text-caption">
                {(file.size / 1_048_576).toFixed(1)} MB
              </p>
            </div>
            {uploading && (
              <>
                <progress
                  value={progress}
                  max={100}
                  aria-label="Tiến độ tải lên"
                  className="accent-accent h-1.5 w-24"
                />
                <span className="num text-fg-muted text-caption">
                  {progress}%
                </span>
              </>
            )}
            <button
              type="button"
              onClick={() => setFile(null)}
              aria-label={`Bỏ file ${file.name}`}
              className="btn btn-ghost px-2"
            >
              <X size={16} aria-hidden="true" />
            </button>
          </div>
        ) : (
          <div
            onDragOver={(e) => {
              e.preventDefault()
              setDragging(true)
            }}
            // Chỉ tắt khi thật sự rời vùng thả, không phải khi đi qua phần tử con
            onDragLeave={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget as Node | null))
                setDragging(false)
            }}
            onDrop={(e) => {
              e.preventDefault()
              setDragging(false)
              pick(e.dataTransfer.files[0])
            }}
            className={cn(
              'rounded-control flex flex-wrap items-center gap-3 border border-dashed p-4 text-sm',
              dragging ? 'border-accent bg-accent-soft' : 'border-border-control'
            )}
          >
            <label className="btn btn-press btn-secondary cursor-pointer focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-(--focus-ring)">
              <Upload size={16} aria-hidden="true" />
              Chọn file
              <input
                type="file"
                accept={ACCEPT}
                className="sr-only"
                onChange={(e) => pick(e.target.files?.[0])}
              />
            </label>
            <span className="text-fg-muted">
              hoặc kéo thả file vào đây
              <br />
              PDF, DOCX · tối đa [dung lượng theo System Policy]
            </span>
          </div>
        )}
        {error && (
          <p role="alert" className="text-danger text-sm">
            {error}
          </p>
        )}

        <MetaFields value={meta} onChange={setMeta} />

        <div className="bg-sunken rounded-surface flex gap-2 p-3 text-sm">
          <Info size={16} aria-hidden="true" className="mt-0.5 shrink-0" />
          <div>
            <p className="text-fg-strong font-semibold">Sau khi tải lên</p>
            <p className="text-fg-muted">
              Hệ thống kiểm tra trùng phiên bản rồi bóc tách sang Chương, Điều,
              Khoản, Điểm. Văn bản vào hàng đợi Chờ duyệt; AI/RAG chưa dùng cho
              tới khi được duyệt và index.
            </p>
          </div>
        </div>
      </fieldset>
    </Modal>
  )
}
