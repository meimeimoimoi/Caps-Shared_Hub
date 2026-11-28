import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { formatVnd } from '@/lib/format-money'
import { Button } from '@/components/ui/actions/button'
import { getPayoutTransferInfo, type Payout } from '../api/payoutsApi'

export type ManualMode = 'info' | 'confirm' | 'fail'

const inputCls =
  'border-border-control rounded-control shadow-control bg-paper h-control border px-3 text-sm font-normal'

// datetime-local wants local time without a zone
const localNow = () => {
  const d = new Date()
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
  return d.toISOString().slice(0, 16)
}

interface Props {
  payout: Payout
  mode: ManualMode
  onConfirm: (bankRef: string, amount: number, at: string) => void
  onFail: (reason: string) => void
  onClose: () => void
}

/* Paying an expert by hand while no PayOS payout channel is configured */
export function ManualPayoutPanel({
  payout,
  mode,
  onConfirm,
  onFail,
  onClose,
}: Props) {
  const { t } = useTranslation(['admin', 'common'])
  const [bankRef, setBankRef] = useState('')
  const [amount, setAmount] = useState('')
  const [at, setAt] = useState(localNow)
  const [reason, setReason] = useState('')
  const info = useQuery({
    queryKey: ['private', 'admin', 'payout-manual', payout.id],
    queryFn: () => getPayoutTransferInfo(payout.id),
    enabled: mode === 'info',
    // The full account number is not kept in the cache once the panel closes
    gcTime: 0,
  })

  const copyRow = (label: string, value: string) => (
    <div className="flex items-center justify-between gap-2">
      <dt className="text-fg-muted">{label}</dt>
      <dd className="flex items-center gap-1">
        <span className="num text-fg-strong break-all">{value}</span>
        <Button
          size="sm"
          variant="ghost"
          aria-label={t('payouts.manual.copy', { field: label })}
          onClick={() => void navigator.clipboard.writeText(value)}
        >
          {t('payouts.manual.copyShort')}
        </Button>
      </dd>
    </div>
  )

  const close = (
    <Button size="sm" variant="ghost" onClick={onClose}>
      {t('payouts.cancel')}
    </Button>
  )

  if (mode === 'info') {
    const d = info.data
    return (
      <div className="flex w-80 flex-col gap-2 text-left text-sm">
        {info.isLoading && (
          <p className="text-fg-muted">{t('common:loading')}</p>
        )}
        {info.error && <p className="text-danger">{info.error.message}</p>}
        {d && (
          <dl className="flex flex-col gap-1">
            {copyRow(t('payouts.manual.bank'), d.bankName)}
            {copyRow(t('payouts.manual.accountNumber'), d.accountNumber)}
            {copyRow(t('payouts.manual.holder'), d.accountHolderName)}
            {copyRow(t('payouts.manual.amount'), String(d.amount))}
            {copyRow(t('payouts.manual.description'), d.description)}
          </dl>
        )}
        <div className="flex justify-end">{close}</div>
      </div>
    )
  }

  if (mode === 'fail')
    return (
      <div className="flex w-72 flex-col gap-2 text-left">
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          maxLength={1000}
          rows={3}
          placeholder={t('payouts.manual.reasonPlaceholder')}
          aria-label={t('payouts.manual.reason')}
          className={`${inputCls} h-auto py-2`}
        />
        <div className="flex justify-end gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={reason.trim().length < 5}
            onClick={() => onFail(reason.trim())}
          >
            {t('payouts.manual.fail')}
          </Button>
          {close}
        </div>
      </div>
    )

  // Typing the amount again catches a slip between the banking app and this page
  const amountOk = Number(amount) === payout.amount
  return (
    <div className="flex w-72 flex-col gap-2 text-left text-sm">
      <label className="flex flex-col gap-1 font-semibold">
        {t('payouts.manual.bankRef')}
        <input
          value={bankRef}
          onChange={(e) => setBankRef(e.target.value)}
          maxLength={100}
          className={inputCls}
        />
      </label>
      <label className="flex flex-col gap-1 font-semibold">
        {t('payouts.manual.amountAgain', { amount: formatVnd(payout.amount) })}
        <input
          type="number"
          min={1}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          aria-invalid={amount !== '' && !amountOk}
          className={inputCls}
        />
      </label>
      {amount !== '' && !amountOk && (
        <p className="text-danger">{t('payouts.errors.amountMismatch')}</p>
      )}
      <label className="flex flex-col gap-1 font-semibold">
        {t('payouts.manual.transferredAt')}
        <input
          type="datetime-local"
          value={at}
          max={localNow()}
          onChange={(e) => setAt(e.target.value)}
          className={inputCls}
        />
      </label>
      <div className="flex justify-end gap-2">
        <Button
          size="sm"
          disabled={bankRef.trim().length < 4 || !amountOk || !at}
          onClick={() =>
            onConfirm(
              bankRef.trim(),
              Number(amount),
              new Date(at).toISOString()
            )
          }
        >
          {t('payouts.manual.confirm')}
        </Button>
        {close}
      </div>
    </div>
  )
}
