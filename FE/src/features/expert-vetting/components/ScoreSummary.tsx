import type { Criterion } from '../types'
import { useTranslation } from 'react-i18next'

interface ScoreSummaryProps {
  criteria: Criterion[]
  scores: Record<string, number>
}

export function ScoreSummary({ criteria, scores }: ScoreSummaryProps) {
  const { t } = useTranslation('admin')
  return (
    <dl className="bg-sunken rounded-surface divide-border-subtle divide-y px-3 text-sm">
      {criteria.map((c) => (
        <div key={c.id} className="flex justify-between gap-4 py-1.5">
          <dt className="text-fg">
            {c.id} {c.name}
          </dt>
          <dd className="text-fg-strong font-semibold whitespace-nowrap">
            {scores[c.id] ? t('detail.scoreSummary.level', { level: scores[c.id] }) : t('detail.scoreSummary.unscored')}
          </dd>
        </div>
      ))}
    </dl>
  )
}

