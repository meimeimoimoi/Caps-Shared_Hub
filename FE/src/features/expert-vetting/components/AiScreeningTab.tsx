import { useTranslation } from 'react-i18next'
import { Check, TriangleAlert } from 'lucide-react'
import { COPY } from '@/lib/constants'
import type { ApplicationDetail, LegalCheck } from '../types'
import { formatDateTime } from '../utils/applications'

const resultLabel = {
  declared: 'detail.aiScreening.declared',
  present: 'detail.aiScreening.present',
  review: 'detail.aiScreening.review',
} as const satisfies Record<LegalCheck['result'], string>

interface AiScreeningTabProps {
  screening: ApplicationDetail['screening']
  reviewedFlags: string[]
  onToggleReviewed: (flagId: string) => void
  onRequestSupplement: () => void
}

export function AiScreeningTab({
  screening,
  reviewedFlags,
  onToggleReviewed,
  onRequestSupplement,
}: AiScreeningTabProps) {
  const { t } = useTranslation('admin')
  const { ranAt, rerunAt, checkedCount, flags, legalChecks } = screening

  return (
    <section className="paper p-5 md:p-6">
      <div className="para-ai">
        <div className="flex items-start justify-between gap-4">
          <h2 className="text-h2">{t('detail.aiScreening.results')}</h2>
          <span className="badge-ai">AI</span>
        </div>
        <p className="text-fg-muted mt-1 text-sm">
          <span className="num">
            {t('detail.aiScreening.ranAt', { time: formatDateTime(ranAt) })}
            {rerunAt &&
              t('detail.aiScreening.rerunAt', {
                time: formatDateTime(rerunAt),
              })}
          </span>
          . {COPY.aiScreeningNote}
        </p>

        <div className="mt-3 flex flex-wrap gap-x-8 gap-y-1">
          <span>
            {t('detail.aiScreening.checked', { count: checkedCount })}
          </span>
          {flags.length > 0 && (
            <span className="text-warning inline-flex items-center gap-1.5">
              <TriangleAlert size={14} aria-hidden="true" />
              {t('detail.aiScreening.flags', { count: flags.length })}
            </span>
          )}
          <span className="text-fg-muted">
            {t('detail.aiScreening.reviewedCount', {
              done: reviewedFlags.length,
              total: flags.length,
            })}
          </span>
        </div>

        {flags.map((f) => {
          const reviewed = reviewedFlags.includes(f.id)
          return (
            <div key={f.id} className="para-check mt-4">
              <p className="text-warning flex items-center gap-2 font-semibold">
                {reviewed ? (
                  <Check size={15} aria-hidden="true" />
                ) : (
                  <TriangleAlert size={15} aria-hidden="true" />
                )}
                {f.title}
              </p>
              <p className="mt-1 pl-6 text-sm">{f.detail}</p>
              <div className="mt-3 flex gap-2 pl-6">
                <button
                  type="button"
                  aria-pressed={reviewed}
                  onClick={() => onToggleReviewed(f.id)}
                  className="btn btn-press btn-secondary bg-paper text-sm"
                >
                  {reviewed
                    ? t('detail.documents.unmark')
                    : t('detail.documents.mark')}
                </button>
                <button
                  type="button"
                  onClick={onRequestSupplement}
                  className="btn btn-press btn-ghost text-sm"
                >
                  {t('decision.label.supplement')}
                </button>
              </div>
            </div>
          )
        })}
      </div>

      <h3 className="text-fg-strong mt-6 font-semibold">
        {t('detail.aiScreening.legalTitle')}
      </h3>
      <div className="mt-2 overflow-x-auto">
        <table className="w-full min-w-[560px] text-sm">
          <thead className="bg-sunken text-fg-muted">
            <tr className="[&>th]:px-3 [&>th]:py-2.5 [&>th]:text-left [&>th]:font-semibold">
              <th>{t('detail.aiScreening.colItem')}</th>
              <th>{t('detail.aiScreening.colResult')}</th>
              <th>{t('detail.aiScreening.colNote')}</th>
              <th>{t('detail.aiScreening.colDocument')}</th>
            </tr>
          </thead>
          <tbody>
            {legalChecks.map((c) => (
              <tr
                key={c.item}
                className="border-border-subtle border-t align-top [&>td]:px-3 [&>td]:py-2.5"
              >
                <td>{c.item}</td>
                <td
                  className={c.result === 'review' ? 'text-warning' : undefined}
                >
                  <span className="inline-flex items-center gap-1.5">
                    {c.result === 'review' ? (
                      <TriangleAlert size={13} aria-hidden="true" />
                    ) : (
                      <Check size={13} aria-hidden="true" />
                    )}
                    {t(resultLabel[c.result])}
                  </span>
                </td>
                <td>{c.note}</td>
                {/* TODO(api): mở file thật khi có URL tài liệu */}
                <td className="underline underline-offset-2">
                  {c.document ?? '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
