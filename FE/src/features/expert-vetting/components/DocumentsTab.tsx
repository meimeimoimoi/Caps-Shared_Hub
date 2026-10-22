import { useTranslation } from 'react-i18next'
import { useState } from 'react'
import { MarginNote } from '@/components/ui/display/margin-note'
import { cn } from '@/lib/utils'
import type { ApplicationDocument, Submission } from '../types'
import { documentKey, documentsBySubmission, formatDate } from '../utils/applications'
import { EvidenceList } from './EvidenceList'
import { DocumentPreview } from './DocumentPreview'

interface DocumentsTabProps {
  documents: ApplicationDocument[]
  /** Document to show first, e.g. after the CV link on the profile tab */
  initialCode?: string
  reviewedFlags: string[]
  onToggleReviewed: (flagId: string) => void
  onOpenFile: (evidenceId: string) => void
  /** Fetches an uploaded file for the in-page preview */
  loadFile: (evidenceId: string) => Promise<Blob | null | undefined>
  /** Submissions of the application; with more than one, files are grouped by the submission that sent them */
  submissions?: Submission[]
}

export function DocumentsTab({
  documents,
  initialCode,
  reviewedFlags,
  onToggleReviewed,
  onOpenFile,
  loadFile,
  submissions = [],
}: DocumentsTabProps) {
  const { t } = useTranslation('admin')
  // Grouped only once the applicant has supplemented; previous/next follows the order shown
  const groups = submissions.length > 1 ? documentsBySubmission(documents, submissions) : null
  if (groups) documents = groups.flatMap((g) => g.documents)
  // Open the document with an AI flag first (demo) so the admin sees what to check
  const [selected, setSelected] = useState(() => {
    const first =
      documents.find((d) =>
        d.pages.some((p) => p.notes.some((n) => n.flagId))
      ) ?? documents[0]
    return initialCode ?? (first && documentKey(first))
  })
  const index = documents.findIndex((d) => documentKey(d) === selected)
  const doc = documents[index]

  return (
    <div className="space-y-4">
      {/* A long file list scrolls inside a fixed frame (about three rows) so the preview stays in view */}
      <div className={cn('border-border overflow-y-auto rounded-md border [&>ul]:rounded-none [&>ul]:border-0', groups ? 'max-h-[13rem]' : 'max-h-[10.5rem]')}>
        {groups ? (
          groups.map((g) => (
            <section key={g.number ?? 'pending'} className="[&>ul]:rounded-none [&>ul]:border-0" aria-label={g.number == null ? t('detail.documents.afterLatest') : t('detail.documents.round', { number: g.number, date: formatDate(g.submittedAt!) })}>
              <h4 className="bg-surface-muted text-text-muted sticky top-0 z-10 flex items-center justify-between gap-2 px-3 py-1.5 text-xs font-medium">
                <span>{g.number == null ? t('detail.documents.afterLatest') : t('detail.documents.round', { number: g.number, date: formatDate(g.submittedAt!) })}</span>
                <span className="tabular-nums">{t('detail.documents.count', { count: g.documents.length })}</span>
              </h4>
              <EvidenceList documents={g.documents} selectedKey={selected} onSelect={setSelected} emptyText="" />
            </section>
          ))
        ) : (
          <EvidenceList
            documents={documents}
            selectedKey={selected}
            onSelect={setSelected}
            emptyText={t('detail.documents.empty')}
          />
        )}
      </div>
      {doc && index >= 0 && (doc.evidenceId || doc.sourceUrl) && (
        <DocumentPreview
          key={selected}
          document={doc}
          index={index}
          total={documents.length}
          onPrevious={() => setSelected(documentKey(documents[index - 1]))}
          onNext={() => setSelected(documentKey(documents[index + 1]))}
          loadFile={loadFile}
          onOpenFile={onOpenFile}
        />
      )}

      {/* TODO(api): khi có file thật thì hiển thị PDF/ảnh gốc, ghi chú theo trang lấy từ API */}
      {doc?.pages.map((page, i) => {
        const notesId = `notes-${doc.code}-${i}`
        return (
          <article key={i} className="paper p-5 md:p-6">
            <header className="mb-4 flex items-baseline justify-between gap-4">
              <h3 className="text-fg-strong font-semibold">{doc.name}</h3>
              <span className="text-fg-muted num shrink-0 text-sm">
                {t('detail.documents.pageOf', {
                  page: i + 1,
                  total: doc.pages.length,
                })}
              </span>
            </header>
            <div className="doc-row">
              <div
                aria-describedby={page.notes.length ? notesId : undefined}
                className="text-doc text-fg-strong"
              >
                {page.title && <p className="mb-3 font-bold">{page.title}</p>}
                {page.paragraphs.map((p, j) => (
                  <p key={j} className="mt-3 first:mt-0">
                    {p}
                  </p>
                ))}
              </div>
              {page.notes.length > 0 && (
                <aside id={notesId} className="space-y-4">
                  <p className="eyebrow">
                    {t('detail.documents.pageNote', { page: i + 1 })}
                  </p>
                  {page.notes.map((n, j) => {
                    const flagId = n.flagId
                    const reviewed = !!flagId && reviewedFlags.includes(flagId)
                    return (
                      <MarginNote
                        key={j}
                        kind={n.kind}
                        label={
                          reviewed ? t('detail.documents.aiReviewed') : n.label
                        }
                        action={
                          flagId
                            ? {
                                label: reviewed
                                  ? t('detail.documents.unmark')
                                  : t('detail.documents.mark'),
                                onClick: () => onToggleReviewed(flagId),
                              }
                            : undefined
                        }
                      >
                        {n.text}
                      </MarginNote>
                    )
                  })}
                </aside>
              )}
            </div>
          </article>
        )
      })}
    </div>
  )
}
