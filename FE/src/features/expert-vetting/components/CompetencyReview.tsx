import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import type { Criterion } from '../types'

const LEVELS = [1, 2, 3, 4]

interface CompetencyReviewProps {
  criteria: Criterion[]
  scores: Record<string, number>
  evidence: Record<string, string>
  disabled: boolean
  onScore: (criterionId: string, level: number) => void
  onEvidence: (criterionId: string, text: string) => void
}

export function CompetencyReview({
  criteria,
  scores,
  evidence,
  disabled,
  onScore,
  onEvidence,
}: CompetencyReviewProps) {
  const { t } = useTranslation('admin')
  return (
    <section className="paper p-5 md:p-6">
      <h2 className="text-h2">{t('detail.competency.title')}</h2>
      <p className="text-fg-muted text-sm">{t('detail.competency.subtitle')}</p>

      {criteria.map((c) => (
        <fieldset
          key={c.id}
          disabled={disabled}
          className="border-border-subtle mt-5 border-t pt-5"
        >
          <legend className="sr-only">{c.name}</legend>
          <p className="text-fg-strong font-semibold">
            {c.id} {c.name}
          </p>
          <p className="text-fg-muted text-sm">{c.description}</p>
          <div className="mt-2 grid grid-cols-4 gap-1.5">
            {LEVELS.map((level) => (
              <label
                key={level}
                className={cn(
                  'rounded-control h-control flex cursor-pointer items-center justify-center gap-1.5 border px-2 text-sm',
                  scores[c.id] === level
                    ? 'border-border-strong bg-sunken text-fg-strong shadow-pressed font-semibold'
                    : 'border-border-control shadow-control'
                )}
              >
                <input
                  type="radio"
                  name={`level-${c.id}`}
                  checked={scores[c.id] === level}
                  onChange={() => onScore(c.id, level)}
                  className="accent-ink"
                />
                {t('detail.competency.level', { level })}
              </label>
            ))}
          </div>
          <label className="mt-3 flex flex-col gap-2 text-sm font-semibold">
            {t('detail.competency.evidence')}
            <textarea
              required
              rows={2}
              value={evidence[c.id] ?? ''}
              onChange={(e) => onEvidence(c.id, e.target.value)}
              className="border-border-control rounded-control shadow-control bg-paper resize-y border px-3 py-2 text-base font-normal"
            />
          </label>
        </fieldset>
      ))}
    </section>
  )
}
