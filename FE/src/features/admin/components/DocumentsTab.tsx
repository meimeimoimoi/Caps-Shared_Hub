import { useState } from 'react'
import { cn } from '@/lib/utils'
import { MarginNote } from '@/components/ui/margin-note'
import type { ApplicationDocument } from '../types'

interface DocumentsTabProps {
  documents: ApplicationDocument[]
  /** Mở sẵn tài liệu này (vd. bấm link CV ở tab Hồ sơ) */
  initialCode?: string
  reviewedFlags: string[]
  onToggleReviewed: (flagId: string) => void
}

export function DocumentsTab({
  documents,
  initialCode,
  reviewedFlags,
  onToggleReviewed,
}: DocumentsTabProps) {
  // Mở sẵn tài liệu có cờ AI (nếu có) để admin xem ngay chỗ cần xem lại
  const [code, setCode] = useState(
    () =>
      initialCode ??
      (
        documents.find((d) =>
          d.pages.some((p) => p.notes.some((n) => n.flagId))
        ) ?? documents[0]
      )?.code
  )
  const doc = documents.find((d) => d.code === code)

  return (
    <div className="space-y-4">
      <div
        role="group"
        aria-label="Chọn tài liệu"
        className="flex flex-wrap gap-2"
      >
        {documents.map((d) => (
          <button
            key={d.code}
            type="button"
            aria-pressed={d.code === code}
            onClick={() => setCode(d.code)}
            className={cn(
              'rounded-control flex items-center gap-2 border px-2.5 py-1 text-sm',
              d.code === code
                ? 'bg-paper border-indicator text-fg-strong shadow-control border-b-2 font-semibold'
                : 'bg-desk-2 border-border text-fg hover:bg-paper'
            )}
          >
            <span className="text-fg-muted num font-normal">{d.code}</span>
            {d.name}
          </button>
        ))}
      </div>

      {doc && doc.pages.length === 0 && (
        <p className="paper text-fg-muted p-5 md:p-6">
          Chưa có bản xem trước cho tài liệu này.
        </p>
      )}

      {/* TODO(api): khi có file thật thì hiển thị PDF/ảnh gốc, ghi chú theo trang lấy từ API */}
      {doc?.pages.map((page, i) => {
        const notesId = `notes-${doc.code}-${i}`
        return (
          <article key={i} className="paper p-5 md:p-6">
            <header className="mb-4 flex items-baseline justify-between gap-4">
              <h3 className="text-fg-strong font-semibold">{doc.name}</h3>
              <span className="text-fg-muted num shrink-0 text-sm">
                {doc.code} · trang {i + 1}/{doc.pages.length}
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
                  <p className="eyebrow">Ghi chú cho trang {i + 1}</p>
                  {page.notes.map((n, j) => {
                    const flagId = n.flagId
                    const reviewed = !!flagId && reviewedFlags.includes(flagId)
                    return (
                      <MarginNote
                        key={j}
                        kind={n.kind}
                        label={reviewed ? 'AI · Đã xem xét' : n.label}
                        action={
                          flagId
                            ? {
                                label: reviewed
                                  ? 'Bỏ đánh dấu'
                                  : 'Đánh dấu đã xem xét',
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
