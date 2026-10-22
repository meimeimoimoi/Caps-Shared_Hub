import { useTranslation } from 'react-i18next'
import {
  Upload,
  FileText,
  X,
  CheckCircle2,
  CircleAlert,
  Loader2,
  Lock,
  Link2,
  FileImage,
} from 'lucide-react'
import { useRef, useState } from 'react'
import { formControlClassName } from '@/components/ui/forms/form-control'
import { useFormatters } from '@/hooks/useFormatters'
import { criterionKey } from '../constants'
import type { EvidenceFile, UploadQuota } from '../types'

export interface FileUploaderProps {
  id: string
  error?: string
  files: EvidenceFile[]
  /** Submitted applications are read-only. */
  disabled?: boolean
  /** Files used across the whole application and the current limit */
  quota?: UploadQuota
  onFilesSelected: (files: FileList | null) => void
  onRemoveFile: (index: number) => void
  onAddLink?: (url: string) => Promise<boolean>
}

export function FileUploader({
  id,
  error,
  files,
  disabled = false,
  quota,
  onFilesSelected,
  onRemoveFile,
  onAddLink,
}: FileUploaderProps) {
  const { t } = useTranslation('expertRegistration')
  const format = useFormatters()

  const [dragging, setDragging] = useState(false)
  const [sourceUrl, setSourceUrl] = useState('')
  const [addingLink, setAddingLink] = useState(false)
  const [linkError, setLinkError] = useState(false)
  const linkPending = useRef(false)
  async function addLink() {
    if (!onAddLink || linkPending.current || disabled || full) return
    const value = sourceUrl.trim()
    try {
      const parsed = new URL(value)
      if (
        !['https:', 'http:'].includes(parsed.protocol) ||
        parsed.username ||
        parsed.password ||
        value.length > 2048
      )
        throw new Error('Invalid URL')
    } catch {
      setLinkError(true)
      return
    }
    setLinkError(false)
    linkPending.current = true
    setAddingLink(true)
    try {
      if (await onAddLink(value)) setSourceUrl('')
    } finally {
      linkPending.current = false
      setAddingLink(false)
    }
  }
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

  // No room left: show why and how to get more instead of a drop zone that only fails
  const full = !!quota && quota.used >= quota.max

  return (
    <div className="expert-file-uploader mb-6">
      {!disabled && full && (
        <div className="expert-file-quota-full" role="status">
          <span className="expert-file-dropzone-icon" aria-hidden="true">
            <Lock size={20} strokeWidth={2} />
          </span>
          <span className="expert-file-dropzone-text">
            <strong>
              {t('quota.fullTitle', { max: format.number(quota.max) })}
            </strong>
            <span>{t('quota.fullBody')}</span>
          </span>
        </div>
      )}
      {!disabled && !full && (
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
            aria-label={t('files.choose', {
              category:
                id === 'CV'
                  ? t('experience.cv')
                  : criterionKey(id)
                    ? t(criterionKey(id)!)
                    : id,
            })}
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
      )}
      {!disabled && !full && onAddLink && (
        <div className="mt-4 space-y-2">
          <label htmlFor={`link-${id}`} className="block text-sm font-medium">
            {t(id === 'CV' ? 'links.label' : 'links.evidenceLabel')}
          </label>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
            <div className="relative min-w-0 flex-1">
              <Link2 size={17} aria-hidden="true" className="text-ex-muted pointer-events-none absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              id={`link-${id}`}
              type="text"
              inputMode="url"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              value={sourceUrl}
              maxLength={2048}
              placeholder={id === 'CV' ? 'https://example.com/cv' : 'https://example.com/document'}
              disabled={addingLink}
              aria-invalid={linkError || undefined}
              aria-describedby={`link-help-${id}${linkError ? ` link-error-${id}` : ''}`}
              className={`${formControlClassName} !min-h-12 min-w-0 !pl-10`}
              onChange={(e) => {
                setSourceUrl(e.target.value)
                setLinkError(false)
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  void addLink()
                }
              }}
            />
            </div>
            <button
              type="button"
              className="btn btn-secondary !min-h-12 shrink-0 disabled:cursor-not-allowed disabled:!opacity-60"
              disabled={addingLink || !sourceUrl.trim()}
              onClick={() => void addLink()}
            >
              {addingLink ? (
                <Loader2
                  size={16}
                  className="animate-spin motion-reduce:animate-none"
                  aria-hidden="true"
                />
              ) : null}
              {t(addingLink ? 'links.adding' : 'links.add')}
            </button>
          </div>
          <p id={`link-help-${id}`} className="text-ex-muted !m-0 w-full !max-w-none text-[12px] leading-relaxed">
            {t(id === 'CV' ? 'links.help' : 'links.evidenceHelp')}
          </p>
          {linkError && (
            <p
              id={`link-error-${id}`}
              role="alert"
              className="expert-validation-message"
            >
              {t('links.invalid')}
            </p>
          )}
        </div>
      )}
      {error && !full && (
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
            <li
              className="expert-file-item"
              key={f.id || `${f.name}-${i}`}
              aria-busy={f.uploading || undefined}
            >
              <span className="expert-file-item-icon" aria-hidden="true">
                {f.sourceUrl ? <Link2 size={18} /> : /\.(png|jpe?g)$/i.test(f.name) ? <FileImage size={18} /> : <FileText size={18} />}
              </span>
              <span className="expert-file-item-info">
                {f.sourceUrl && /^https?:\/\//i.test(f.sourceUrl) ? (
                  <a
                    className="expert-file-item-name break-all underline underline-offset-4"
                    href={f.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={t('files.openNamed', { name: f.name })}
                  >
                    {f.name}
                  </a>
                ) : (
                  <span className="expert-file-item-name" title={f.name}>{f.name}</span>
                )}
                <span className="expert-file-item-meta">
                  {f.uploading ? (
                    <>
                      <Loader2
                        size={12}
                        className="animate-spin motion-reduce:animate-none"
                        aria-hidden="true"
                      />
                      {t('files.uploading')}
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={12} aria-hidden="true" />
                      {f.sourceUrl
                        ? t('links.saved')
                        : t('files.uploadedSize', {
                            size: format.number(Math.max(1, f.size / 1024), {
                              maximumFractionDigits: 0,
                            }),
                          })}
                    </>
                  )}
                </span>
              </span>
              {f.canRemove && !f.uploading && (
                <button
                  type="button"
                  className="expert-file-item-remove"
                  aria-label={t('files.remove', { name: f.name })}
                  title={t('files.remove', { name: f.name })}
                  onClick={() => onRemoveFile(i)}
                >
                  <X size={16} />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
