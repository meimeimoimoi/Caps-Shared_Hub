import { useTranslation } from 'react-i18next'
import { Check, TriangleAlert, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { APPLICATION_STATUS } from '@/lib/constants'
import { DECISION_NOTE_LABEL, DECISION_STATUS } from '../constants'
import type { ApplicationDetail, Criterion, DecisionRecord } from '../types'
import { formatDateTime } from '../utils/applications'
import { ScoreSummary } from './ScoreSummary'

const verdict = {
  approve: { cls: 'verdict-refund text-success', Icon: Check },
  reject: { cls: 'verdict-negative text-danger', Icon: X },
  supplement: { cls: 'verdict-waiting text-warning', Icon: TriangleAlert },
}

interface DecisionCardProps {
  decision: DecisionRecord
  criteria: Criterion[]
  scores: Record<string, number>
}

/* Thẻ "Quyết định của System Admin" sau khi đã ra quyết định */
export function DecisionCard({
  decision,
  criteria,
  scores,
}: DecisionCardProps) {
  const { t } = useTranslation('admin')
  const { cls, Icon } = verdict[decision.kind]
  return (
    <section className="paper card-hover p-5 md:p-6">
      <h2 className="text-h2">{t('detail.decisionTitle')}</h2>
      <div className={cn('verdict mt-3', cls)}>
        <span className="inline-flex items-center gap-1.5 font-semibold">
          <Icon size={16} aria-hidden="true" />
          {APPLICATION_STATUS[DECISION_STATUS[decision.kind]].label}
        </span>
        <span className="text-fg-muted text-sm">
          {decision.by} ·{' '}
          <span className="num">{formatDateTime(decision.at)}</span>
        </span>
      </div>
      {decision.kind === 'approve' && (
        <div className="mt-4">
          <ScoreSummary criteria={criteria} scores={scores} />
        </div>
      )}
      {decision.note && (
        <div className="mt-4 text-sm">
          <p className="text-fg-strong font-semibold">
            {t(DECISION_NOTE_LABEL[decision.kind])}
          </p>
          <p className="text-fg mt-1 whitespace-pre-line">{decision.note}</p>
        </div>
      )}
    </section>
  )
}

interface AiSummaryCardProps {
  screening: ApplicationDetail['screening']
  flagReviews: Record<string, string>
  reviewer: string
  onOpenDetail: () => void
}

/* Tóm tắt kết quả AI sàng lọc cho trang đã ra quyết định */
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
