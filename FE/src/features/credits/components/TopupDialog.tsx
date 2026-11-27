import { useCallback, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { CircleCheck } from 'lucide-react'
import { Modal } from '@/components/ui/feedback/modal'
import { useFormatters } from '@/hooks/useFormatters'
import { Countdown } from '@/features/review-case/components/CaseUi'
import { createTopup, TOPUP_MAX, TOPUP_MIN } from '../api/creditsApi'
import { useTopupStatus } from '../hooks/useTopup'
import type { Topup } from '../types'

const inputCls =
  'border-border-control rounded-control shadow-control bg-paper h-control num w-full border px-3 text-base font-normal'

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-fg-muted">{label}</dt>
      <dd className="text-fg-strong num font-semibold break-all">{children}</dd>
    </div>
  )
}

/* Top-up through PayOS: pick an amount, then pay on the PayOS page (its QR code) or by transfer before it expires.
 * Credits arrive when PayOS confirms the transfer; the dialog keeps asking billing until then. */
export function TopupDialog({
  initialAmount,
  onClose,
}: {
  initialAmount?: number
  onClose: () => void
}) {
  const { t } = useTranslation('reviewCase')
  const format = useFormatters()
  const [amount, setAmount] = useState(
    initialAmount ? String(initialAmount) : ''
  )
  const [topup, setTopup] = useState<Topup | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [expired, setExpired] = useState(false)
  const status = useTopupStatus(topup).data?.status
  const expire = useCallback(() => setExpired(true), [])
  const value = Number(amount)
  const paid = status === 'SUCCEEDED'
  const ended = !paid && (expired || status === 'FAILED')

  const start = () => {
    if (!Number.isInteger(value) || value < TOPUP_MIN || value > TOPUP_MAX)
      return setError(
        t('wallet.topup.range', {
          min: format.money(TOPUP_MIN),
          max: format.money(TOPUP_MAX),
        })
      )
    setBusy(true)
    setError(null)
    createTopup(value)
      .then((created) => {
        setExpired(false)
        setTopup(created)
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setBusy(false))
  }

  if (!topup)
    return (
      <Modal
        title={t('wallet.topup.title')}
        onClose={onClose}
        onSubmit={start}
        footer={
          <>
            <button
              type="button"
              onClick={onClose}
              className="btn btn-press btn-secondary"
            >
              {t('wallet.topup.cancel')}
            </button>
            <button
              type="submit"
              disabled={busy}
              className="btn btn-press btn-primary"
            >
              {busy ? t('wallet.topup.creating') : t('wallet.topup.create')}
            </button>
          </>
        }
      >
        <label className="flex flex-col gap-1.5 text-sm font-semibold">
          {t('wallet.topup.amount')}
          <input
            required
            inputMode="numeric"
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/\D/g, ''))}
            placeholder="100000"
            className={inputCls}
          />
        </label>
        {error && (
          <p role="alert" className="text-danger mt-2 text-sm">
            {error}
          </p>
        )}
      </Modal>
    )

  return (
    <Modal
      title={t('wallet.topup.payTitle', { amount: format.money(topup.amount) })}
      onClose={onClose}
      footer={
        <>
          {ended && (
            <button
              type="button"
              onClick={() => setTopup(null)}
              className="btn btn-press btn-secondary"
            >
              {t('wallet.topup.again')}
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="btn btn-press btn-primary"
          >
            {paid ? t('wallet.topup.done') : t('wallet.topup.close')}
          </button>
        </>
      }
    >
      {paid ? (
        <p className="text-success flex items-center gap-2 font-semibold">
          <CircleCheck size={18} aria-hidden="true" />
          {t('wallet.topup.paid')}
        </p>
      ) : ended ? (
        <p role="alert" className="text-danger font-semibold">
          {status === 'FAILED'
            ? t('wallet.topup.failed')
            : t('wallet.topup.expired')}
        </p>
      ) : (
        <div className="space-y-5">
          <a
            href={topup.checkoutUrl}
            target="_blank"
            rel="noreferrer"
            className="btn btn-primary w-full no-underline"
          >
            {t('wallet.topup.openPayos')}
          </a>
          <dl className="space-y-3 text-sm">
            {topup.accountName && (
              <Row label={t('wallet.topup.accountName')}>
                {topup.accountName}
              </Row>
            )}
            {topup.accountNumber && (
              <Row label={t('wallet.topup.accountNumber')}>
                {topup.accountNumber}
              </Row>
            )}
            {topup.transferNote && (
              <Row label={t('wallet.topup.note')}>{topup.transferNote}</Row>
            )}
            <Row label={t('wallet.topup.expiresIn')}>
              <Countdown dueAt={topup.expiresAt} onExpire={expire} />
            </Row>
          </dl>
          <p className="text-fg-muted text-sm" aria-live="polite">
            {t('wallet.topup.waiting')}
          </p>
        </div>
      )}
    </Modal>
  )
}
