import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { QUALIFICATION_STATUS } from '@/lib/constants'
import { StatusBadge } from '@/components/ui/display/status-badge'
import { useCompetencyLabel } from '../hooks/useLabels'
import type { QualificationDetail } from '../types'
import { formatDate, formatDateTime } from '../utils/applications'

/* Latest Gate 2 result: per-competency results, notes and cited files */
export function CompetencyResultCard({
  detail,
}: {
  detail: QualificationDetail
}) {
  const { t } = useTranslation('admin')
  const label = useCompetencyLabel()
  const fileName = new Map(
    detail.profile.documents.map((d) => [d.evidenceId, `${d.code} · ${d.name}`])
  )
  return (
    <section className="paper p-5 md:p-6">
      <h2 className="text-h2">{t('competency.resultTitle')}</h2>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <StatusBadge status={QUALIFICATION_STATUS[detail.status]} />
        {detail.decidedAt && (
          <span className="text-fg-muted num text-sm">
            {t('eligibility.decidedAt', {
              time: formatDateTime(detail.decidedAt),
            })}
          </span>
        )}
      </div>
      {detail.competencies.length === 0 ? (
        <p className="text-fg-muted mt-3 text-sm">
          {t('competency.noDecision')}
        </p>
      ) : (
        <ul className="divide-border-subtle mt-4 divide-y text-sm">
          {detail.competencies.map((c) => (
            <li key={c.code} className="py-2">
              <div className="flex justify-between gap-4">
                <span className="text-fg-muted">
                  <span className="num">{c.code}</span> {label.name(c.code)}
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
              <p className="text-fg mt-1 whitespace-pre-line">{c.note}</p>
              {c.evidenceIds.length > 0 && (
                <p className="text-fg-muted mt-1">
                  {c.evidenceIds.map((id) => fileName.get(id) ?? id).join(', ')}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
      {detail.decisionNote && (
        <p className="text-fg mt-3 text-sm whitespace-pre-line">
          {detail.decisionNote}
        </p>
      )}
      {detail.status === 'PENDING_FINAL_APPROVAL' && (
        <p className="text-fg-muted mt-3 text-sm">{t('competency.handoff')}</p>
      )}
      {detail.earliestReapplyAt && (
        <p className="text-fg-muted mt-3 text-sm">
          {t('competency.reapplyAt', {
            date: formatDate(detail.earliestReapplyAt),
          })}
        </p>
      )}
    </section>
  )
}
