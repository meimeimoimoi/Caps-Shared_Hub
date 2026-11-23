import { useTranslation } from 'react-i18next'
import { Check, FileCheck2, TriangleAlert } from 'lucide-react'
import { cn } from '@/lib/utils'
import type {
  ApplicationDocument,
  CriterionDeclaration,
  EligibilityCheck,
  ScreeningPoint,
} from '../types'
import { documentKey, formatDateTime } from '../utils/applications'
import { EvidenceList } from './EvidenceList'

/* What a reviewer judges one Gate 1 criterion on, one block per source, so other checks (e.g. AI screening
 * points of the criterion) can be added next to them without touching the editor */

/** Statements the applicant agreed to that support this criterion, word for word with when they agreed */
export function CriterionDeclarations({ declarations }: { declarations: CriterionDeclaration[] }) {
  const { t } = useTranslation('admin')
  if (!declarations.length) return null
  return (
    <section aria-labelledby="criterion-declarations" className="mb-5">
      <h4 id="criterion-declarations" className="text-text-strong mb-2 text-sm font-medium">{t('eligibility.declarations.title')}</h4>
      <ul className="space-y-2">
        {declarations.map((d) => (
          <li key={`${d.code}-${d.language}`} className="border-border bg-surface-muted/50 rounded-lg border p-4 text-sm leading-6">
            <p className="text-text flex gap-2.5"><FileCheck2 size={16} aria-hidden="true" className="text-success mt-1 shrink-0" /><span className="whitespace-pre-line">{d.text}</span></p>
            <p className="text-text-muted mt-2 text-xs">{t('eligibility.declarations.agreedAt', { time: formatDateTime(d.agreedAt) })}</p>
          </li>
        ))}
      </ul>
    </section>
  )
}

/** Files and links the applicant attached to this criterion */
export function CriterionEvidence({
  documents,
  onShowDocument,
}: {
  documents: ApplicationDocument[]
  onShowDocument: (key: string) => void
}) {
  const { t } = useTranslation('admin')
  return (
    <section aria-labelledby="criterion-evidence" className="mb-5">
      <h4 id="criterion-evidence" className="text-text-strong mb-2 text-sm font-medium">{t('detail.documents.forCriterion')}</h4>
      <EvidenceList documents={documents} onOpen={(d) => onShowDocument(documentKey(d))} showGroup={false} emptyText={t('detail.documents.noneForCriterion')} />
    </section>
  )
}

/** The criterion's result in the previous decision, when the application was sent back */
export function CriterionPrevious({ before }: { before?: EligibilityCheck }) {
  const { t } = useTranslation('admin')
  if (!before) return null
  return (
    <p className="text-text-muted mb-5 text-sm leading-6">
      {t('eligibility.previous', { result: t(`eligibility.results.${before.result}`) })}
      {before.note && ` · ${before.note}`}
    </p>
  )
}

/** Screening points tied to this criterion so reviewers see discrepancies in context */
export function CriterionScreeningPoints({
  points,
  onOpenAiTab,
}: {
  points: ScreeningPoint[]
  onOpenAiTab?: () => void
}) {
  const { t } = useTranslation('admin')
  if (!points.length) return null
  return (
    <section aria-labelledby="criterion-screening" className="mb-5">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h4 id="criterion-screening" className="text-text-strong text-sm font-medium">
          {t('detail.aiScreening.forCriterion')}
        </h4>
        {onOpenAiTab && (
          <button
            type="button"
            onClick={onOpenAiTab}
            className="text-text-strong text-xs underline underline-offset-4"
          >
            {t('detail.aiScreening.viewDetail')}
          </button>
        )}
      </div>
      <ul className="space-y-2">
        {points.map((p) => {
          const open = p.status === 'OPEN'
          return (
            <li
              key={p.id}
              className={cn(
                'rounded-lg border px-3 py-2.5 text-sm',
                open
                  ? 'border-warning/40 bg-warning/5'
                  : 'border-border bg-surface-muted/40'
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <span className="text-text-strong flex items-center gap-1.5 font-medium">
                  {open ? (
                    <TriangleAlert size={14} aria-hidden="true" className="text-warning shrink-0" />
                  ) : (
                    <Check size={14} aria-hidden="true" className="text-success shrink-0" />
                  )}
                  {p.title}
                </span>
                <span
                  className={cn(
                    'shrink-0 rounded-full px-2 py-0.5 text-xs font-medium',
                    open ? 'bg-warning/15 text-warning' : 'bg-success/10 text-success'
                  )}
                >
                  {t(`detail.aiScreening.pointStatus.${p.status}`)}
                </span>
              </div>
              <p className="text-text mt-1 text-xs leading-5">{p.detail}</p>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
