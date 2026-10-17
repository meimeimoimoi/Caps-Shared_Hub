import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Info } from 'lucide-react'
import { cn } from '@/lib/utils'
import { StatusBadge } from '@/components/ui/display/status-badge'
import {
  DISPUTE_ESCALATION_HOURS,
  DISPUTE_OUTCOME,
  type DisputeOutcome,
} from '../constants'

interface DisputeDecisionProps {
  hoursLeft: number
  /** 48 hours, or 96 once escalated */
  slaHours: number
  decided: boolean
  escalated: boolean
  onDecide: (outcome: DisputeOutcome, reason: string) => void
  onEscalate: () => void
}

/* Thẻ "Quyết định trọng tài": chọn kết quả + lý do, gửi cho cả Client và chuyên gia */
export function DisputeDecision({
  hoursLeft,
  slaHours,
  decided,
  escalated,
  onDecide,
  onEscalate,
}: DisputeDecisionProps) {
  const { t } = useTranslation('admin')
  const [outcome, setOutcome] = useState<DisputeOutcome>()
  const [reason, setReason] = useState('')

  return (
    <form
      className="paper p-5 md:p-6"
      // `required` trên radio + textarea đã chặn submit khi thiếu
      onSubmit={(e) => {
        e.preventDefault()
        if (outcome) onDecide(outcome, reason)
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-h2">{t('disputes.decision.title')}</h2>
        <StatusBadge
          status={{
            label: t('disputes.decision.timeLeft', {
              left: hoursLeft,
              total: slaHours,
            }),
            tone: 'warning',
          }}
        />
      </div>

      <div className="bg-sunken rounded-surface mt-4 flex gap-2 p-3 text-sm">
        <Info size={16} aria-hidden="true" className="mt-0.5 shrink-0" />
        <div>
          <p className="text-fg-strong font-semibold">
            {t('disputes.decision.lockedTitle')}
          </p>
          <p className="text-fg-muted">{t('disputes.decision.lockedBody')}</p>
        </div>
      </div>

      {/* Professional-judgment disputes go to an Authorized Reviewer; allowed once */}
      {!decided && (
        <div className="mt-4 text-sm">
          {escalated ? (
            <p className="text-fg-muted">{t('disputes.escalation.done')}</p>
          ) : (
            <>
              <p className="text-fg-muted">
                {t('disputes.escalation.hint', {
                  hours: DISPUTE_ESCALATION_HOURS,
                })}
              </p>
              <button
                type="button"
                onClick={onEscalate}
                className="btn btn-press btn-secondary mt-2 w-full"
              >
                {t('disputes.escalation.action')}
              </button>
            </>
          )}
        </div>
      )}

      <fieldset disabled={decided} className="mt-5">
        <legend className="text-sm font-semibold">
          {t('disputes.decision.outcome')}
        </legend>
        <div className="mt-2 space-y-2">
          {Object.entries(DISPUTE_OUTCOME).map(([key, o]) => (
            <label
              key={key}
              className={cn(
                'rounded-control flex cursor-pointer gap-3 border p-3',
                outcome === key
                  ? 'border-border-strong bg-sunken shadow-pressed'
                  : 'border-border-control shadow-control'
              )}
            >
              <input
                type="radio"
                name="outcome"
                required
                checked={outcome === key}
                onChange={() => setOutcome(key as DisputeOutcome)}
                className="accent-ink mt-1"
              />
              <span className="text-sm">
                <span className="text-fg-strong block font-semibold">
                  {t(o.label)}
                </span>
                <span className="block">{t(o.hint)}</span>
                <span className="text-fg-muted text-caption num block">
                  {t(o.split)}
                </span>
              </span>
            </label>
          ))}
        </div>

        <label className="mt-5 flex flex-col gap-2 text-sm font-semibold">
          {t('disputes.decision.reason')}
          <textarea
            required
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={t('disputes.decision.reasonHint')}
            className="border-border-control rounded-control shadow-control bg-paper placeholder:text-fg-muted resize-y border px-3 py-2 text-base font-normal"
          />
        </label>

        <button type="submit" className="btn btn-press btn-primary mt-4 w-full">
          {decided
            ? t('disputes.decision.done')
            : t('disputes.decision.submit')}
        </button>
      </fieldset>
    </form>
  )
}
