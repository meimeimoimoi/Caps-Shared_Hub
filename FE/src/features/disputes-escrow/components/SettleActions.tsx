import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { formatVnd } from '@/lib/format-money'
import { HelpTip } from '@/components/ui/feedback/help-tip'
import { releaseSplit } from '../api/escrowMappers'

const inputCls =
  'border-border-control rounded-control shadow-control bg-paper h-control num w-full border px-3 text-base font-normal'
const GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/* Closing a HELD escrow through billing: pay the expert (minus the platform fee) or refund the payer's credits.
 * Each choice asks for confirmation with the amounts first. */
export function SettleActions({
  amount,
  platformShare,
  onRelease,
  onRefund,
}: {
  amount: number
  /** Default platform fee in percent */
  platformShare: number
  /** Reject → keep the form open and show the error */
  onRelease: (expertUserId: string, platformFeePct: number) => Promise<unknown>
  onRefund: () => Promise<unknown>
}) {
  const { t } = useTranslation('admin')
  const [mode, setMode] = useState<'release' | 'refund' | null>(null)
  const [expertId, setExpertId] = useState('')
  const [fee, setFee] = useState(String(platformShare))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const pct = Number(fee)
  const split = releaseSplit(amount, Number.isFinite(pct) ? pct : 0)

  const run = (action: () => Promise<unknown>) => {
    setBusy(true)
    setError(null)
    action()
      .then(() => setMode(null))
      .catch((e: Error) => setError(e.message))
      .finally(() => setBusy(false))
  }
  const release = () => {
    if (!GUID.test(expertId.trim()))
      return setError(t('escrow.settle.expertIdInvalid'))
    if (!Number.isInteger(pct) || pct < 0 || pct > 100)
      return setError(t('escrow.settle.invalidFee'))
    run(() => onRelease(expertId.trim(), pct))
  }
  const cancel = () => {
    setMode(null)
    setError(null)
  }

  if (!mode)
    return (
      <div className="flex flex-wrap justify-end gap-2">
        <button
          type="button"
          onClick={() => setMode('refund')}
          className="btn btn-press btn-secondary"
        >
          {t('escrow.settle.refund')}
        </button>
        <button
          type="button"
          onClick={() => setMode('release')}
          className="btn btn-press btn-primary"
        >
          {t('escrow.settle.release')}
        </button>
      </div>
    )

  return (
    <div className="w-full space-y-3">
      {mode === 'release' ? (
        <>
          <label className="flex flex-col gap-1.5 text-sm font-semibold">
            <span className="inline-flex items-center gap-1">
              {t('escrow.settle.expertId')}
              <HelpTip label={t('escrow.settle.expertId')}>
                {t('escrow.settle.expertIdHelp')}
              </HelpTip>
            </span>
            <input
              value={expertId}
              onChange={(e) => setExpertId(e.target.value)}
              placeholder="00000000-0000-0000-0000-000000000000"
              className={inputCls}
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-semibold">
            {t('escrow.settle.fee')}
            <input
              inputMode="numeric"
              value={fee}
              onChange={(e) => setFee(e.target.value.replace(/\D/g, ''))}
              className={`${inputCls} max-w-32`}
            />
          </label>
          <p className="text-fg-strong text-sm">
            {t('escrow.settle.releaseSummary', {
              expert: formatVnd(split.expert),
              fee: formatVnd(split.fee),
            })}
          </p>
        </>
      ) : (
        <p className="text-fg-strong text-sm">
          {t('escrow.settle.refundSummary', { amount: formatVnd(amount) })}
        </p>
      )}
      {error && (
        <p role="alert" className="text-danger text-sm">
          {error}
        </p>
      )}
      <div className="flex flex-wrap justify-end gap-2">
        <button
          type="button"
          onClick={cancel}
          disabled={busy}
          className="btn btn-press btn-secondary"
        >
          {t('escrow.settle.cancel')}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={mode === 'release' ? release : () => run(onRefund)}
          className="btn btn-press btn-primary"
        >
          {mode === 'release'
            ? t('escrow.settle.confirmRelease')
            : t('escrow.settle.confirmRefund')}
        </button>
      </div>
    </div>
  )
}
