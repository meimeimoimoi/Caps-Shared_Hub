import { useTranslation } from 'react-i18next'
import { Upload, FileText, X, CheckCircle2, CircleAlert } from 'lucide-react'
import { useRef, useState } from 'react'
import { useFormatters } from '@/hooks/useFormatters'
import { criterionKey } from '../constants'

export interface FileUploaderProps {
  id: string
  error?: string
  files: File[]
  onFilesSelected: (files: FileList | null) => void
  onRemoveFile: (index: number) => void
}

export function FileUploader({
  id,
  error,
  files,
  onFilesSelected,
  onRemoveFile,
}: FileUploaderProps) {
  const { t } = useTranslation('expertRegistration')
  const format = useFormatters()

  const [dragging, setDragging] = useState(false)
  const dragDepth = useRef(0)
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    dragDepth.current = 0
    setDragging(false)
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFilesSelected(e.dataTransfer.files)
    }
  }

  return (
    <div className="expert-file-uploader mb-6">
      <label
        className={`expert-file-dropzone ${error ? 'expert-file-dropzone--invalid' : ''}`}
        data-dragging={dragging}
        onDragEnter={(e) => {
          e.preventDefault()
          if (!Array.from(e.dataTransfer.types).includes('Files')) return
          dragDepth.current += 1
          setDragging(true)
        }}
        onDragLeave={() => {
          dragDepth.current = Math.max(0, dragDepth.current - 1)
          if (dragDepth.current === 0) setDragging(false)
        }}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <span className="expert-file-dropzone-icon" aria-hidden="true">
          <Upload size={22} strokeWidth={2} />
        </span>
        <span className="expert-file-dropzone-text">
          <strong>
            {id === 'CV' ? t('documents.cv') : t('documents.choose')}
          </strong>
          <span>{t('documents.drop')}</span>
        </span>
        <span className="expert-file-dropzone-formats">
          {t('documents.formats')}
        </span>
        <input
          id={`validation-${id}`}
          aria-invalid={!!error}
          aria-describedby={error ? `error-${id}` : undefined}
          aria-label={t('files.choose', { category: id === 'CV' ? t('experience.cv') : criterionKey(id) ? t(criterionKey(id)!) : id })}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png"
          multiple
          className="sr-only"
          onChange={(e) => {
            onFilesSelected(e.target.files)
            e.target.value = ''
          }}
        />
      </label>
      {error && (
        <p
          id={`error-${id}`}
          className="expert-validation-message"
          role="alert"
        >
          <CircleAlert size={16} aria-hidden="true" />
          <span>{error}</span>
        </p>
      )}
      {files.length > 0 && (
        <ul className="expert-file-list">
          {files.map((f, i) => (
            <li className="expert-file-item" key={`${f.name}-${i}`}>
              <span className="expert-file-item-icon" aria-hidden="true">
                <FileText size={18} />
              </span>
              <span className="expert-file-item-info">
                <span className="expert-file-item-name">{f.name}</span>
                <span className="expert-file-item-meta">
                  <CheckCircle2 size={12} aria-hidden="true" />
                  {t('files.localSize', { size: format.number(f.size / 1024, { maximumFractionDigits: 0 }) })}
                </span>
              </span>
              <button
                type="button"
                className="expert-file-item-remove"
                aria-label={t('files.remove', { name: f.name })}
                onClick={() => onRemoveFile(i)}
              >
                <X size={16} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
