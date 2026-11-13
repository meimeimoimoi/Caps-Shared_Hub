import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AlertTriangle, Info } from 'lucide-react'
import { Modal } from '@/components/ui/feedback/modal'
import { HelpTip } from '@/components/ui/feedback/help-tip'
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
  /** Rejects when the server refuses; the error stays on the card */
  onDecide: (outcome: DisputeOutcome, reason: string) => Promise<unknown>
  onEscalate: () => Promise<unknown>
}

/* Arbitration card: pick an outcome and a reason, then confirm; the decision moves escrow money
 * and cannot be taken back, so it is restated in a dialog before it is sent */
export function DisputeDecision({
  hoursLeft,
  slaHours,
  decided,
  escalated,
  onDecide,
  onEscalate,
}: DisputeDecisionProps) {
  const { t } = useTranslation(['admin', 'common'])
  const [outcome, setOutcome] = useState<DisputeOutcome>()
  const [reason, setReason] = useState('')
  const [confirming, setConfirming] = useState<'decide' | 'escalate' | null>(
    null
  )
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const run = async () => {
    if (!confirming || pending) return
    setPending(true)
    setError(null)
    try {
      if (confirming === 'decide' && outcome) await onDecide(outcome, reason)
      else if (confirming === 'escalate') await onEscalate()
    } catch {
      setError(
        confirming === 'decide'
          ? t('disputes.decision.failed')
          : t('disputes.escalation.failed')
      )
    } finally {
      setPending(false)
      setConfirming(null)
    }
  }

  return (
    <form
      className="paper p-5 md:p-6"
      // `required` trên radio + textarea đã chặn submit khi thiếu
      onSubmit={(e) => {
        e.preventDefault()
        if (!reason.trim()) {
          setError(t('disputes.decision.reasonMissing'))
          return
        }
        setError(null)
        if (outcome) setConfirming('decide')
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
            tone:
              hoursLeft <= 12 ? 'danger' : hoursLeft <= 24 ? 'warning' : 'neutral',
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
            className="border-border-control rounded-control shadow-control bg-paper placeholder:text-fg-muted resize-y border px-3 py-2 text-base font-normal"
          />
        </label>

        {error && (
          <p
            role="alert"
            className="text-danger mt-4 flex items-start gap-2 text-sm font-semibold"
          >
            <AlertTriangle
              size={16}
              aria-hidden="true"
              className="mt-0.5 shrink-0"
            />
            {error}
          </p>
        )}
        <button type="submit" className="btn btn-press btn-primary mt-4 w-full">
          {decided
            ? t('disputes.decision.done')
            : t('disputes.decision.submit')}
        </button>
      </fieldset>

      {/* Professional-judgment disputes go to an Authorized Reviewer; allowed once.
          Kept below the decision so the card has one primary path */}
      {!decided && (
        <div className="border-border-subtle mt-5 border-t pt-4 text-sm">
          {escalated ? (
            <p>{t('disputes.escalation.done')}</p>
          ) : (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setConfirming('escalate')}
                className="btn btn-press btn-secondary flex-1"
              >
                {t('disputes.escalation.action')}
              </button>
              <HelpTip label={t('disputes.escalation.action')}>
                {t('disputes.escalation.hint', {
                  hours: DISPUTE_ESCALATION_HOURS,
                })}
              </HelpTip>
            </div>
          )}
        </div>
      )}

      {confirming && (
        <Modal
          title={
            confirming === 'decide'
              ? t('disputes.decision.confirmTitle')
              : t('disputes.escalation.confirmTitle')
          }
          description={
            confirming === 'decide'
              ? t('disputes.decision.confirmBody')
              : t('disputes.escalation.confirmBody', {
                  hours: DISPUTE_ESCALATION_HOURS,
                })
          }
          onClose={() => setConfirming(null)}
          preventClose={pending}
          footer={
            <>
              <button
                type="button"
                autoFocus
                disabled={pending}
                onClick={() => setConfirming(null)}
                className="btn btn-press btn-secondary"
              >
                {t('common:actions.cancel')}
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={() => void run()}
                className={`btn btn-press ${confirming === 'decide' ? 'btn-danger' : 'btn-primary'}`}
              >
                {confirming === 'decide'
                  ? t('disputes.decision.submit')
                  : t('disputes.escalation.action')}
              </button>
            </>
          }
        >
          {confirming === 'decide' && outcome && (
            <dl className="bg-sunken rounded-surface mt-4 space-y-2 p-3 text-sm">
              <div>
                <dt className="text-fg-muted">{t('disputes.decision.outcome')}</dt>
                <dd className="text-fg-strong font-semibold">
                  {t(DISPUTE_OUTCOME[outcome].label)}
                </dd>
                <dd className="num">{t(DISPUTE_OUTCOME[outcome].split)}</dd>
              </div>
              <div>
                <dt className="text-fg-muted">{t('disputes.decision.reason')}</dt>
                <dd className="break-words whitespace-pre-wrap">{reason}</dd>
              </div>
            </dl>
          )}
        </Modal>
      )}
    </form>
  )
}
