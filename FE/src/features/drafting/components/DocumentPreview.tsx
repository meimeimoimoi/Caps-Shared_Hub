import { useTranslation } from 'react-i18next'
import { useDraftPresentation } from '@/features/drafting/hooks/useDraftPresentation'

import type { DraftVersion } from '../types'

export function DocumentPreview({
  draft,
  onCitation,
}: {
  draft: DraftVersion
  onCitation: (id: string) => void
}) {
  const display = useDraftPresentation()

  const { t } = useTranslation('drafting')

  return (
    <article
      className="rounded-surface border-border bg-paper shadow-paper min-w-0 border p-5 md:p-10 xl:p-12"
      aria-label={t('documentLabel', {
        version: display.number(draft.version),
      })}
    >
      <p className="border-border text-caption text-fg-muted mb-8 border-y py-4">
        {t('disclaimer')}
      </p>
      <h2 className="text-h1-tool mb-8 text-center leading-snug break-words">
        {draft.title}
      </h2>
      <div className="mx-auto max-w-[70ch] space-y-8">
        {draft.sections.map((section) => (
          <section id={`draft-section-${section.id}`} key={section.id}>
            <h3 className="text-h2 text-fg-strong mb-3 font-serif font-semibold">
              {section.title}
            </h3>
            <p className="text-doc leading-relaxed break-words whitespace-pre-wrap">
              {section.content}
            </p>
            {section.citationIds.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {section.citationIds.map((citationId) => (
                  <button
                    key={citationId}
                    onClick={() => onCitation(citationId)}
                    className="rounded-control border-border text-caption text-accent-text hover:bg-sunken min-h-11 border px-3"
                  >
                    {t('sourceNumber', {
                      number: display.number(
                        draft.citations.findIndex(
                          (citation) => citation.id === citationId
                        ) + 1
                      ),
                    })}
                  </button>
                ))}
              </div>
            )}
          </section>
        ))}
      </div>
      <footer className="border-border text-caption text-fg-muted mt-10 border-t pt-4">
        {t('documentFooter', {
          version: display.number(draft.version),
          template: draft.templateVersionId,
          snapshot: draft.snapshotId,
        })}
      </footer>
    </article>
  )
}
