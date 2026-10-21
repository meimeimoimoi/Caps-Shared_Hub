import { useTranslation } from 'react-i18next'
import { Check, TriangleAlert, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { APPLICATION_STATUS } from '@/lib/constants'
import { useEligibilityLabel } from '../hooks/useLabels'
import type { ApplicationDetail, ApplicationStatus } from '../types'
import { formatDate, formatDateTime } from '../utils/applications'

const verdict: Partial<
  Record<ApplicationStatus, { cls: string; Icon: typeof Check }>
> = {
  ELIGIBLE: { cls: 'verdict-refund text-success', Icon: Check },
  NOT_ELIGIBLE: { cls: 'verdict-negative text-danger', Icon: X },
  NEED_MORE_INFORMATION: {
    cls: 'verdict-waiting text-warning',
    Icon: TriangleAlert,
  },
}

/* Latest Gate 1 result: per-requirement results and notes as the applicant sees them */
export function DecisionCard({ detail }: { detail: ApplicationDetail }) {
  const { t } = useTranslation('admin')
  const label = useEligibilityLabel()
  const { cls, Icon } = verdict[detail.status] ?? {
    cls: 'verdict-waiting text-fg-muted',
    Icon: TriangleAlert,
  }
  if (!detail.eligibility.length) {
    return (
      <section className="paper p-5 md:p-6">
        <h2 className="text-h2">{t('eligibility.resultTitle')}</h2>
        <p className="text-fg-muted mt-1 text-sm">
          {t('eligibility.notReviewable')} {t('eligibility.noDecision')}
        </p>
      </section>
    )
  }
  return (
    <section className="paper card-hover p-5 md:p-6">
      <h2 className="text-h2">{t('eligibility.resultTitle')}</h2>
      <div className={cn('verdict mt-3', cls)}>
        <span className="inline-flex items-center gap-1.5 font-semibold">
          <Icon size={16} aria-hidden="true" />
          {APPLICATION_STATUS[detail.status].label}
        </span>
        {detail.decidedAt && (
          <span className="text-fg-muted num text-sm">
            {t('eligibility.decidedAt', {
              time: formatDateTime(detail.decidedAt),
            })}
          </span>
        )}
      </div>
      <ul className="divide-border-subtle mt-4 divide-y text-sm">
        {detail.eligibility.map((c) => (
          <li key={c.code} className="py-2">
            <div className="flex justify-between gap-4">
              <span className="text-fg-muted">
                {label(c.code)}
              </span>
              <span
                className={cn(
                  'shrink-0 font-semibold',
                  c.result === 'FAIL'
                    ? 'text-danger'
                    : c.result === 'NEED_MORE_INFORMATION'
                      ? 'text-warning'
                      : 'text-fg-strong'
                )}
              >
                {t(`eligibility.results.${c.result}`)}
              </span>
            </div>
            {c.note && (
              <p className="text-fg mt-1 whitespace-pre-line">{c.note}</p>
            )}
          </li>
        ))}
      </ul>
      {detail.decisionNote && (
        <p className="text-fg mt-3 text-sm whitespace-pre-line">
          {detail.decisionNote}
        </p>
      )}
      {detail.earliestReapplyAt && (
        <p className="text-fg-muted mt-3 text-sm">
          {t('eligibility.reapplyAt', {
            date: formatDate(detail.earliestReapplyAt),
          })}
        </p>
      )}
    </section>
  )
}

interface AiSummaryCardProps {
  screening: NonNullable<ApplicationDetail['screening']>
  flagReviews: Record<string, string>
  reviewer: string
  onOpenDetail: () => void
}

/* AI screening summary once the decision is made (demo only) */
export function AiSummaryCard({
  screening,
  flagReviews,
  reviewer,
  onOpenDetail,
}: AiSummaryCardProps) {
  const { t } = useTranslation('admin')
  const { checkedCount, flags } = screening
  const allReviewed = flags.every((f) => flagReviews[f.id])
  const reviewed = flags.filter((f) => flagReviews[f.id])

  return (
    <section className="paper p-5 md:p-6">
      <div className="flex items-start justify-between gap-4">
        <h2 className="text-h2">{t('detail.aiScreening.results')}</h2>
        <span className="badge-ai">AI</span>
      </div>
      <p className="text-fg-muted mt-1 text-sm">
        {t('detail.aiScreening.checked', { count: checkedCount })} ·{' '}
        {flags.length ? (
          <>
            {t('detail.aiScreening.flags', { count: flags.length })}
            {allReviewed && `, ${t('detail.aiScreening.allReviewed')}`}.
          </>
        ) : (
          t('detail.aiScreening.noFlags')
        )}
      </p>
      {reviewed.length > 0 && (
        <ul className="border-border-subtle mt-3 space-y-2 border-t pt-3 text-sm">
          {reviewed.map((f) => (
            <li key={f.id} className="flex gap-2">
              <Check
                size={14}
                aria-hidden="true"
                className="text-fg-strong mt-1 shrink-0"
              />
              <div>
                <p className="text-fg-strong font-semibold">
                  {t('detail.aiScreening.documentReviewed', {
                    document: f.document,
                  })}
                </p>
                <p className="text-fg-muted">
                  {reviewer} ·{' '}
                  <span className="num">
                    {formatDateTime(flagReviews[f.id])}
                  </span>
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
      <button
        type="button"
        onClick={onOpenDetail}
        className="text-fg-strong mt-3 text-sm underline underline-offset-4"
      >
        {t('detail.aiScreening.viewDetail')}
      </button>
    </section>
  )
}
