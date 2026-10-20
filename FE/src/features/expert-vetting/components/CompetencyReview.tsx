import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { COMPETENCY_RESULTS } from '../constants'
import { useCompetencyLabel } from '../hooks/useLabels'
import type {
  ApplicationDocument,
  CompetencyAssessment,
  CompetencyCheck,
  CompetencyResult,
} from '../types'

interface CompetencyReviewProps {
  assessments: CompetencyAssessment[]
  /** Files the reviewer may cite: Gate 1 documents and those added for the service */
  documents: ApplicationDocument[]
  /** Results of the previous decision (the expert has supplemented since) */
  previous: CompetencyCheck[]
  disabled: boolean
  onResult: (code: string, result: CompetencyResult) => void
  onNote: (code: string, note: string) => void
  onToggleEvidence: (code: string, evidenceId: string) => void
}

/* Gate 2 form: one result per competency C1…C5 with a note; PASS and FAIL cite at least one file */
export function CompetencyReview({
  assessments,
  documents,
  previous,
  disabled,
  onResult,
  onNote,
  onToggleEvidence,
}: CompetencyReviewProps) {
  const { t } = useTranslation('admin')
  const label = useCompetencyLabel()
  const before = new Map(previous.map((c) => [c.code, c]))
  const files = documents.filter((d) => d.evidenceId)

  return (
    <section className="paper p-5 md:p-6">
      <h2 className="text-h2">{t('competency.title')}</h2>
      <p className="text-fg-muted text-sm">{t('competency.subtitle')}</p>

      {assessments.map((a) => {
        const last = before.get(a.code)
        const citeRequired = !!a.result && a.result !== 'NEED_MORE_INFORMATION'
        return (
          <fieldset
            key={a.code}
            disabled={disabled}
            className="border-border-subtle mt-5 border-t pt-5"
          >
            <legend className="sr-only">{label.name(a.code)}</legend>
            <p className="text-fg-strong font-semibold">
              <span className="num">{a.code}</span> {label.name(a.code)}
            </p>
            <p className="text-fg-muted text-sm">{label.hint(a.code)}</p>
            {last && (
              <p className="text-fg-muted text-sm">
                {t('competency.previous', {
                  result: t(`eligibility.results.${last.result}`),
                })}
                {last.note && ` · ${last.note}`}
              </p>
            )}
            <div className="mt-2 grid grid-cols-3 gap-1.5">
              {COMPETENCY_RESULTS.map((result) => (
                <label
                  key={result}
                  className={cn(
                    'rounded-control min-h-control flex cursor-pointer items-center justify-center gap-1.5 border px-2 py-1 text-center text-sm',
                    a.result === result
                      ? 'border-border-strong bg-sunken text-fg-strong shadow-pressed font-semibold'
                      : 'border-border-control shadow-control'
                  )}
                >
                  <input
                    type="radio"
                    name={`competency-${a.code}`}
                    checked={a.result === result}
                    onChange={() => onResult(a.code, result)}
                    className="accent-ink"
                  />
                  {t(`eligibility.results.${result}`)}
                </label>
              ))}
            </div>
            <div className="mt-3 text-sm">
              <p className="font-semibold">
                {citeRequired
                  ? t('competency.evidenceRequired')
                  : t('competency.evidenceOptional')}
              </p>
              {files.length === 0 ? (
                <p className="text-fg-muted mt-1">{t('competency.noFiles')}</p>
              ) : (
                <ul className="mt-1.5 flex flex-wrap gap-1.5">
                  {files.map((d) => (
                    <li key={d.evidenceId}>
                      <label
                        className={cn(
                          'rounded-control inline-flex cursor-pointer items-center gap-1.5 border px-2 py-1',
                          a.evidenceIds.includes(d.evidenceId!)
                            ? 'border-border-strong bg-sunken text-fg-strong'
                            : 'border-border-control'
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={a.evidenceIds.includes(d.evidenceId!)}
                          onChange={() =>
                            onToggleEvidence(a.code, d.evidenceId!)
                          }
                          className="accent-ink"
                        />
                        <span className="num">{d.code}</span> · {d.name}
                      </label>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <label className="mt-3 flex flex-col gap-2 text-sm font-semibold">
              {t('competency.noteRequired')}
              <textarea
                required
                rows={2}
                maxLength={2000}
                value={a.note}
                onChange={(e) => onNote(a.code, e.target.value)}
                placeholder={t('competency.notePlaceholder')}
                className="border-border-control rounded-control shadow-control bg-paper placeholder:text-fg-muted resize-y border px-3 py-2 text-base font-normal"
              />
            </label>
          </fieldset>
        )
      })}
    </section>
  )
}
