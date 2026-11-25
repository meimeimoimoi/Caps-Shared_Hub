import { useTranslation } from 'react-i18next'
import { ArrowRight, Check, Clock, TriangleAlert } from 'lucide-react'
import { cn } from '@/lib/utils'
import { APPLICATION_STATUS } from '@/lib/constants'
import { ELIGIBILITY_OUTCOME } from '../constants'
import type { EligibilityOutcome } from '../types'

interface EligibilityDecisionPanelProps {
  outcome: EligibilityOutcome
  /** Why the decision cannot be confirmed yet; empty when ready */
  blockers: { text: string; tone?: 'warning' }[]
  disabled: boolean
  onConfirm: () => void
}

const tone = {
  // Buttons use the shared button tokens: accent to approve, danger to reject, neutral to ask for more
  success: { chip: 'bg-success/10 text-success', button: 'btn-primary' },
  warning: { chip: 'bg-warning/10 text-warning', button: 'btn-secondary' },
  danger: { chip: 'bg-danger/10 text-danger', button: 'btn-danger' },
} as const

/** Gate 1 footer: the outcome the results lead to, what still blocks it, and the matching confirm action */
export function EligibilityDecisionPanel({ outcome, blockers, disabled, onConfirm }: EligibilityDecisionPanelProps) {
  const { t } = useTranslation('admin')
  const config = ELIGIBILITY_OUTCOME[outcome]
  const style = tone[config.tone]
  const ready = blockers.length === 0

  return (
    <section aria-label={t('eligibility.outcomeLabel')} className="border-border bg-surface mt-4 flex flex-wrap items-center gap-x-6 gap-y-3 rounded-lg border px-4 py-3">
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-text-muted">{t('eligibility.outcomeLabel')}</span>
          {/* Shown while incomplete too, muted, so the reviewer sees where the results are heading */}
          <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-semibold', ready ? style.chip : 'bg-surface-muted text-text-muted')}>
            {APPLICATION_STATUS[outcome].label}
          </span>
        </p>
        <ul className="mt-1.5 space-y-0.5 text-xs leading-5">
          {ready ? (
            <li className="text-success inline-flex items-center gap-1.5"><Check size={13} aria-hidden="true" />{t('eligibility.readyShort')}</li>
          ) : (
            blockers.map(({ text, tone: blockerTone }) => (
              <li key={text} className={cn('flex items-center gap-1.5', blockerTone === 'warning' ? 'text-warning' : 'text-text-muted')}>
                {blockerTone === 'warning' ? <TriangleAlert size={13} aria-hidden="true" /> : <Clock size={13} aria-hidden="true" />}
                {text}
              </li>
            ))
          )}
        </ul>
      </div>
      <button
        type="button"
        disabled={disabled}
        onClick={onConfirm}
        className={cn('btn btn-press min-h-11 shrink-0 focus-visible:ring-2 focus-visible:ring-[var(--ui-border-strong)] focus-visible:ring-offset-2 focus-visible:outline-none', style.button)}
      >
        {t(config.confirm)}
        <ArrowRight size={16} aria-hidden="true" />
      </button>
    </section>
  )
}
