import { useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, ExternalLink, FileText, Link2, LoaderCircle } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { ApplicationDocument } from '../types'

interface DocumentPreviewProps {
  document: ApplicationDocument
  index: number
  total: number
  onPrevious: () => void
  onNext: () => void
  /** Fetches an uploaded file through the review API */
  loadFile: (evidenceId: string) => Promise<Blob | null | undefined>
  onOpenFile: (evidenceId: string) => void
}

type Preview =
  | { state: 'loading' }
  | { state: 'ready'; url: string; kind: 'image' | 'pdf' | 'other' }
  | { state: 'failed' }

const isLink = (d: ApplicationDocument) => !!d.sourceUrl && /^https?:\/\//i.test(d.sourceUrl)

/** Shows the selected file inside the page (image or PDF), so the reviewer never leaves the review. */
export function DocumentPreview({ document: doc, index, total, onPrevious, onNext, loadFile, onOpenFile }: DocumentPreviewProps) {
  const { t } = useTranslation('admin')
  const link = isLink(doc)
  const evidenceId = link ? undefined : doc.evidenceId
  const [preview, setPreview] = useState<Preview>({ state: 'loading' })
  // Callers pass a new function each render; only a new file should reload the preview
  const load = useRef(loadFile)
  useEffect(() => {
    load.current = loadFile
  })

  useEffect(() => {
    if (!evidenceId) return
    let url: string | undefined
    let cancelled = false
    setPreview({ state: 'loading' })
    load.current(evidenceId)
      .then((blob) => {
        if (cancelled) return
        if (!blob) throw new Error('no file')
        url = URL.createObjectURL(blob)
        const kind = blob.type.startsWith('image/') ? 'image' : blob.type === 'application/pdf' ? 'pdf' : 'other'
        setPreview({ state: 'ready', url, kind })
      })
      .catch(() => !cancelled && setPreview({ state: 'failed' }))
    return () => {
      cancelled = true
      if (url) URL.revokeObjectURL(url)
    }
  }, [evidenceId])

  const open = () => {
    if (link) window.open(doc.sourceUrl!, '_blank', 'noopener,noreferrer')
    else if (doc.evidenceId) onOpenFile(doc.evidenceId)
  }
  const stepButton = 'border-border text-text-muted hover:bg-surface-muted hover:text-text-strong focus-visible:ring-[var(--ui-border-strong)] inline-flex size-8 items-center justify-center rounded-md border focus-visible:ring-2 focus-visible:outline-none disabled:opacity-40'

  return (
    <section aria-label={doc.name} className="border-border overflow-hidden rounded-md border">
      <header className="border-border flex items-center gap-2 border-b px-3 py-2">
        <p className="text-text-strong min-w-0 flex-1 truncate text-sm font-medium" title={doc.name}>{doc.name}</p>
        <span className="text-text-muted shrink-0 text-xs tabular-nums">{index + 1}/{total}</span>
        <button type="button" className={stepButton} disabled={index === 0} onClick={onPrevious} aria-label={t('detail.documents.previous')} title={t('detail.documents.previous')}>
          <ChevronLeft size={15} aria-hidden="true" />
        </button>
        <button type="button" className={stepButton} disabled={index >= total - 1} onClick={onNext} aria-label={t('detail.documents.next')} title={t('detail.documents.next')}>
          <ChevronRight size={15} aria-hidden="true" />
        </button>
        {(link || doc.evidenceId) && (
          <button type="button" className={stepButton} onClick={open} aria-label={t('detail.documents.newTab')} title={t('detail.documents.newTab')}>
            <ExternalLink size={14} aria-hidden="true" />
          </button>
        )}
      </header>

      <div className="bg-surface-muted/40 flex min-h-72 items-center justify-center">
        {link ? (
          // External pages usually refuse to be embedded: show where the link goes and open it outside
          <div className="flex max-w-sm flex-col items-center gap-3 p-6 text-center">
            <Link2 size={22} aria-hidden="true" className="text-text-muted" />
            <p className="text-text-muted text-sm">{t('detail.documents.linkHint')}</p>
            <p className="text-text-strong max-w-full text-sm break-all">{doc.sourceUrl}</p>
            <button type="button" onClick={open} className="border-border text-text-strong hover:bg-surface-muted inline-flex h-8 items-center gap-1.5 rounded-md border px-3 text-sm font-medium">
              {t('detail.documents.openLink')}
              <ExternalLink size={13} aria-hidden="true" />
            </button>
          </div>
        ) : !evidenceId ? (
          <p className="text-text-muted p-6 text-sm">{t('detail.documents.noPreview')}</p>
        ) : preview.state === 'loading' ? (
          <LoaderCircle size={20} aria-label={t('detail.documents.loading')} className="text-text-muted animate-spin motion-reduce:animate-none" />
        ) : preview.state === 'failed' ? (
          <p role="alert" className="text-text-muted p-6 text-sm">{t('detail.documents.openFailed')}</p>
        ) : preview.kind === 'image' ? (
          <img src={preview.url} alt={doc.name} className="max-h-[70vh] w-full object-contain" />
        ) : preview.kind === 'pdf' ? (
          <iframe src={preview.url} title={doc.name} className="h-[70vh] w-full" />
        ) : (
          <div className="flex flex-col items-center gap-3 p-6 text-center">
            <FileText size={22} aria-hidden="true" className="text-text-muted" />
            <p className="text-text-muted text-sm">{t('detail.documents.noPreview')}</p>
          </div>
        )}
      </div>
    </section>
  )
}
