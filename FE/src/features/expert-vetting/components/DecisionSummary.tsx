import { useTranslation } from 'react-i18next'
import {
  CalendarClock,
  Check,
  CircleAlert,
  CircleCheck,
  CircleSlash,
  CircleX,
  TriangleAlert,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { APPLICATION_STATUS } from '@/lib/constants'
import { EXPERIENCE_CODE } from '../constants'
import { useEligibilityLabel } from '../hooks/useLabels'
import type {
  ApplicationDetail,
  ApplicationStatus,
  EligibilityResult,
} from '../types'
import { formatDate, formatDateTime } from '../utils/applications'

/* Same colours as the assessment checklist, so a result reads the same before and after the decision */
const resultChip: Record<
  EligibilityResult,
  { chip: string; text: string; Icon: typeof Check }
> = {
  PASS: {
    chip: 'bg-success/10 text-success',
    text: 'text-success',
    Icon: CircleCheck,
  },
  NEED_MORE_INFORMATION: {
    chip: 'bg-warning/10 text-warning',
    text: 'text-warning',
    Icon: CircleAlert,
  },
  FAIL: {
    chip: 'bg-danger/10 text-danger',
    text: 'text-danger',
    Icon: CircleX,
  },
  NOT_APPLICABLE: {
    chip: 'bg-surface-muted text-text-muted',
    text: 'text-text-muted',
    Icon: CircleSlash,
  },
}

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

/* Same frame as the reference panel beside it (radius, border, no hover lift), so the two read as one row */
const CARD = 'border-border bg-surface flex flex-col rounded-lg border p-5'

/* Latest Gate 1 result: per-requirement results and notes as the applicant sees them */
export function DecisionCard({
  detail,
  className = '',
}: {
  detail: ApplicationDetail
  /** Extra layout classes, e.g. to stretch to the height of the panel beside it */
  className?: string
}) {
  const { t } = useTranslation('admin')
  const label = useEligibilityLabel()
  const { cls, Icon } = verdict[detail.status] ?? {
    cls: 'verdict-waiting text-fg-muted',
    Icon: TriangleAlert,
  }
  if (!detail.eligibility.length) {
    return (
      <section className={cn(CARD, className)}>
        <h2 className="text-h2">{t('eligibility.resultTitle')}</h2>
        <p className="text-fg-muted mt-1 text-sm">
          {t('eligibility.notReviewable')} {t('eligibility.noDecision')}
        </p>
      </section>
    )
  }
  const total = detail.eligibility.length
  const met = detail.eligibility.filter(
    (c) => c.result === 'PASS' || c.result === 'NOT_APPLICABLE'
  ).length
  // What still needs attention comes first; within each group the EV order is kept
  const rank = (r: EligibilityResult) =>
    r === 'FAIL'
      ? 0
      : r === 'NEED_MORE_INFORMATION'
        ? 1
        : r === 'NOT_APPLICABLE'
          ? 2
          : 3
  const rows = [...detail.eligibility].sort(
    (a, b) => rank(a.result) - rank(b.result)
  )
  const byStatement = detail.declarationPassedCriteria ?? []

  return (
    <section className={cn(CARD, className)}>
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-h2">{t('eligibility.resultTitle')}</h2>
        <span className="text-fg-muted shrink-0 text-xs tabular-nums">
          {t('eligibility.summary', { met, total })}
        </span>
      </div>
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
      {/* One row per criterion: a status mark to scan down, the result on the right (a pill only when it
          needs attention), and the basis (declared years, statement, reviewer note) as quiet detail */}
      {/* The list takes the card's spare height: each row grows evenly, so a tall panel beside the card
          spaces the criteria out instead of leaving blank space below */}
      <ul className="divide-border-subtle mt-4 flex flex-1 flex-col divide-y text-sm">
        {rows.map((c) => {
          const { chip, text, Icon: ResultIcon } = resultChip[c.result]
          const attention =
            c.result === 'FAIL' || c.result === 'NEED_MORE_INFORMATION'
          const experience =
            c.code === EXPERIENCE_CODE && c.appliedMinYearsExperience != null
          const statement =
            c.result === 'PASS' && byStatement.includes(c.code) && !c.note
          return (
            <li
              key={c.code}
              className="flex min-h-16 flex-1 flex-col justify-center py-4 first:pt-2 last:pb-2"
            >
              {/* Icon and text move together, so the icon stays level with the criterion name */}
              <div className="flex gap-3">
                <ResultIcon
                  size={18}
                  aria-hidden="true"
                  className={cn('mt-px shrink-0', text)}
                />
                <div className="min-w-0 flex-1 space-y-1.5">
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-fg-strong leading-5">
                      {label(c.code)}
                    </span>
                    <span
                      className={cn(
                        'shrink-0 text-xs font-medium',
                        attention ? cn('rounded-full px-2 py-0.5', chip) : text
                      )}
                    >
                      {t(`eligibility.results.${c.result}`)}
                    </span>
                  </div>
                  {experience && (
                    <p className="text-fg-muted text-xs leading-5 tabular-nums">
                      {t('eligibility.experienceMeta', {
                        years: detail.years,
                        min: c.appliedMinYearsExperience,
                      })}
                    </p>
                  )}
                  {statement && (
                    <p className="text-fg-muted text-xs leading-5">
                      {t('eligibility.declarations.meta')}
                    </p>
                  )}
                  {c.note && (
                    <p
                      className={cn(
                        'text-[13px] leading-5 whitespace-pre-line',
                        attention ? 'text-fg' : 'text-fg-muted'
                      )}
                    >
                      {c.note}
                    </p>
                  )}
                </div>
              </div>
            </li>
          )
        })}
      </ul>
      {detail.decisionNote && (
        <div className="bg-surface-muted mt-3 rounded-md px-3 py-2.5 text-sm">
          <p className="text-fg-muted text-xs font-medium">
            {t('eligibility.overallNote')}
          </p>
          <p className="text-fg mt-0.5 whitespace-pre-line">
            {detail.decisionNote}
          </p>
        </div>
      )}
      {detail.earliestReapplyAt && (
        <p className="text-fg-muted mt-3 inline-flex items-center gap-1.5 text-sm">
          <CalendarClock size={14} aria-hidden="true" />
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
