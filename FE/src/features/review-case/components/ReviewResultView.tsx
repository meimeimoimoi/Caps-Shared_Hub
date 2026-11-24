import { useTranslation } from 'react-i18next'
import { Lock } from 'lucide-react'
import { MarginNote } from '@/components/ui/display/margin-note'
import { StatusBadge } from '@/components/ui/display/status-badge'
import { REVIEW_RESULT } from '@/lib/constants'
import type { ReviewCase, ReviewResult } from '../types'
import { useCaseFormat } from '../ui'

/* Kết quả bàn giao, trình bày như tài liệu: nội dung bên trái, căn cứ ở lề phải (doc-row) */
export function ReviewResultView({
  result,
  caseId,
  expert,
}: {
  result: ReviewResult
  caseId: string
  expert: ReviewCase['expert']
}) {
  const { t } = useTranslation('reviewCase')
  const f = useCaseFormat()
  const notes = result.outcome === 'VERIFIED' ? result.notes : result.findings

  return (
    <section className="paper p-6 md:p-10" aria-labelledby="result-title">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="eyebrow">{t('result.title')}</p>
          <h2 id="result-title" className="text-h2 mt-1 font-serif">
            {t(`result.${result.outcome}`)}
          </h2>
          <p className="text-fg-muted mt-1 text-sm">
            {t('result.by', {
              name: expert.name,
              date: f.at(result.deliveredAt),
            })}
          </p>
        </div>
        <StatusBadge
          status={{
            label: result.outcome,
            tone: REVIEW_RESULT[result.outcome].tone,
          }}
        />
      </div>

      {result.outcome === 'VERIFIED' && result.verifiedVersion && (
        <p className="bg-sunken rounded-surface mt-6 flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3 text-sm">
          <Lock size={15} aria-hidden="true" className="text-fg-strong" />
          <span className="text-fg-strong font-semibold">
            {t('result.verifiedVersion')}
          </span>
          <span className="num text-fg-strong">{result.verifiedVersion}</span>
          <span className="text-fg-muted">
            {t('result.immutable', { id: caseId })}
          </span>
        </p>
      )}

      <div className="doc-row mt-8">
        <div className="space-y-6">
          {result.outcome === 'VERIFIED' ? (
            <div>
              <h3 className="eyebrow">{t('result.conclusion')}</h3>
              <p className="text-doc text-fg-strong mt-2 max-w-[65ch] wrap-break-word whitespace-pre-wrap">
                {result.conclusion}
              </p>
            </div>
          ) : (
            <>
              <div>
                <h3 className="eyebrow">{t('result.summary')}</h3>
                <p className="text-doc text-fg-strong mt-2 max-w-[65ch] wrap-break-word whitespace-pre-wrap">
                  {result.summary}
                </p>
              </div>
              <div>
                <h3 className="eyebrow">{t('result.rationale')}</h3>
                <p className="text-doc text-fg mt-2 max-w-[65ch] wrap-break-word whitespace-pre-wrap">
                  {result.rationale}
                </p>
              </div>
            </>
          )}
        </div>
        {notes.length > 0 && (
          <div className="space-y-4">
            <h3 className="eyebrow">
              {t(
                result.outcome === 'VERIFIED'
                  ? 'result.notes'
                  : 'result.findings'
              )}
            </h3>
            {/* A delivered citation is one sentence with no separate note: only its number goes in the
                upper-case label, the sentence itself reads as body text */}
            {notes.map((n, i) => (
              <MarginNote
                key={`${i}-${n.ref}`}
                kind="cite"
                label={n.note ? `[${i + 1}] ${n.ref}` : `[${i + 1}]`}
              >
                {n.note || n.ref}
              </MarginNote>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
