import { Upload, FileText, X, CheckCircle2, CircleAlert } from 'lucide-react'

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
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFilesSelected(e.dataTransfer.files)
    }
  }

  return (
    <div className="expert-file-uploader mb-6">
      <label
        className={`expert-file-dropzone ${error ? 'expert-file-dropzone--invalid' : ''}`}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <span className="expert-file-dropzone-icon" aria-hidden="true">
          <Upload size={22} strokeWidth={2} />
        </span>
        <span className="expert-file-dropzone-text">
          <strong>{id === 'CV' ? 'Choose your CV' : 'Choose supporting files'}</strong>
          <span>or drag and drop here</span>
        </span>
        <span className="expert-file-dropzone-formats">
          PDF, JPG or PNG · up to 10 MB each (demo)
        </span>
        <input
          id={`validation-${id}`}
          aria-invalid={!!error}
          aria-describedby={error ? `error-${id}` : undefined}
          aria-label={`Choose files for ${id}`}
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
      {error && <p id={`error-${id}`} className="expert-validation-message" role="alert"><CircleAlert size={16} aria-hidden="true" /><span>{error}</span></p>}
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
                  {(f.size / 1024).toFixed(0)} KB · Selected locally
                </span>
              </span>
              <button
                type="button"
                className="expert-file-item-remove"
                aria-label={`Remove ${f.name}`}
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
