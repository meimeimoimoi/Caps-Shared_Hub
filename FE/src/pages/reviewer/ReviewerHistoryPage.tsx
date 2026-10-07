import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useReviewer, eligibilityIds, competencyIds } from '@/features/reviewer'
import { useFormatters } from '@/hooks/useFormatters'

export default function ReviewerHistoryPage() {
  const { t } = useTranslation('reviewer')
  const { state, query } = useReviewer()
  const format = useFormatters()
  const rows = [...state.history]
    .reverse()
    .filter((row) =>
      `${row.expertName} ${row.recordId} ${row.applicationId} ${row.serviceId ?? ''}`
        .toLowerCase()
        .includes(query.trim().toLowerCase())
    )
  return (
    <>
      <h1 className="text-text-strong text-3xl font-semibold tracking-tight">
        {t('history')}
      </h1>
      <p className="text-text-muted mt-3 mb-8 max-w-3xl leading-relaxed">
        {t('historyIntro')}
      </p>
      {!rows.length ? (
        <div className="border-border rounded-xl border p-8">
          <h2 className="text-text-strong text-lg font-semibold">
            {t(
              state.history.length && query.trim() ? 'noReviews' : 'noHistory'
            )}
          </h2>
          <p className="text-text-muted mt-2">
            {t(
              state.history.length && query.trim()
                ? 'noReviewsBody'
                : 'noHistoryBody'
            )}
          </p>
          <Link
            to="/reviewer"
            className="text-accent-text mt-4 inline-flex min-h-11 items-center"
          >
            {t('back')}
          </Link>
        </div>
      ) : (
        <div className="border-border bg-surface divide-border divide-y rounded-xl border">
          {rows.map((entry) => (
            <details key={entry.id} className="group p-5">
              <summary className="cursor-pointer text-sm">
                <span className="text-text-strong font-semibold">
                  {entry.expertName}
                </span>
                <span className="text-text-muted mx-3">
                  {entry.recordId} ·{' '}
                  {t(entry.gate === 'GATE_1' ? 'gate1' : 'gate2')}
                </span>
                <span className="text-accent-text font-medium">
                  {t(`decisions.${entry.decision}`)}
                </span>
                <span className="text-text-muted mt-2 block sm:ml-5">
                  {format.timestamp(entry.at, 'Asia/Bangkok', {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  })}{' '}
                  · {entry.actorName} · {entry.policy.version}
                </span>
              </summary>
              <div className="mt-5 space-y-4 text-sm">
                <p className="break-words whitespace-pre-wrap">
                  {entry.draft.note}
                </p>
                <p className="text-text-muted">
                  {t('reviewer')}: {entry.actorId} · {entry.applicationId}
                  {entry.serviceId ? ` · ${entry.serviceId}` : ''}
                </p>
                {entry.earliestReapplyAt && (
                  <p className="text-warning">
                    {t('cooldown', {
                      date: format.timestamp(
                        entry.earliestReapplyAt,
                        'Asia/Bangkok',
                        { dateStyle: 'medium', timeStyle: 'short' }
                      ),
                    })}
                  </p>
                )}
                {entry.decision === 'NEED_MORE_INFORMATION' && (
                  <p>{t('sameApplication')}</p>
                )}
                {entry.gate === 'GATE_2' && entry.decision === 'PASS' && (
                  <p>{t('handoff')}</p>
                )}
                <h2 className="font-semibold">{t('assessments')}</h2>
                <ul className="divide-border divide-y">
                  {Object.entries(entry.draft.assessments).map(([id, row]) => (
                    <li key={id} className="py-3">
                      <p className="font-medium">
                        {entry.gate === 'GATE_1'
                          ? t(
                              `eligibility.${id as (typeof eligibilityIds)[number]}`
                            )
                          : t('competencyCriterion', {
                              number:
                                competencyIds.indexOf(
                                  id as (typeof competencyIds)[number]
                                ) + 1,
                            })}
                        {' · '}
                        {row.result ? t(`results.${row.result}`) : '—'} ·{' '}
                        {row.evidenceId}
                      </p>
                      <p className="text-text-muted mt-1 break-words whitespace-pre-wrap">
                        {row.note}
                      </p>
                    </li>
                  ))}
                </ul>
                <Link
                  to={`/reviewer/${entry.gate === 'GATE_1' ? 'gate-1' : 'gate-2'}/${entry.recordId}`}
                  className="text-accent-text inline-flex min-h-11 items-center"
                >
                  {t('viewReview')}
                </Link>
              </div>
            </details>
          ))}
        </div>
      )}
    </>
  )
}
