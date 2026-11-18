import { useCallback, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { QRCodeSVG } from 'qrcode.react'
import { CircleCheck } from 'lucide-react'
import { Modal } from '@/components/ui/feedback/modal'
import { useFormatters } from '@/hooks/useFormatters'
import { Countdown } from '@/features/review-case/components/CaseUi'
import type { CreditPackage } from '@/features/service-pricing/types'
import { createTopup } from '../api/walletApi'
import { useTopupStatus } from '../hooks/useTopup'
import type { Topup } from '../types'

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-fg-muted">{label}</dt>
      <dd className="text-fg-strong num font-semibold break-all">{children}</dd>
    </div>
  )
}

/* Buying a credit package through PayOS: confirm the package, then pay the VietQR code (or the PayOS page)
 * before it expires. Credits arrive when PayOS confirms the transfer; the dialog keeps asking billing until then. */
export function TopupDialog({
  pkg,
  onClose,
}: {
  /** A package with a price; billing charges its current price */
  pkg: CreditPackage
  onClose: () => void
}) {
  const { t } = useTranslation('reviewCase')
  const format = useFormatters()
  const [topup, setTopup] = useState<Topup | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [expired, setExpired] = useState(false)
  const status = useTopupStatus(topup).data?.status
  const expire = useCallback(() => setExpired(true), [])
  const paid = status === 'SUCCEEDED'
  const ended = !paid && (expired || status === 'FAILED')

  const start = () => {
    setBusy(true)
    setError(null)
    createTopup(pkg.id)
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
        <dl className="grid gap-3 text-sm sm:grid-cols-3">
          <Row label={t('wallet.topup.package')}>{pkg.name}</Row>
          <Row label={t('wallet.topup.credits')}>
            {t('wallet.unit', { count: pkg.credits })}
          </Row>
          <Row label={t('wallet.topup.amount')}>
            {format.money(pkg.price ?? 0)}
          </Row>
        </dl>
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
        <div className="grid gap-5 sm:grid-cols-[auto_minmax(0,1fr)]">
          {/* QR codes need a light background to scan, whatever the theme */}
          <div className="rounded-surface self-start bg-white p-3">
            <QRCodeSVG
              value={topup.qrCode}
              size={184}
              title={t('wallet.topup.qr')}
            />
          </div>
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
          <a
            href={topup.checkoutUrl}
            target="_blank"
            rel="noreferrer"
            className="btn btn-secondary no-underline sm:col-span-2"
          >
            {t('wallet.topup.openPayos')}
          </a>
          <p className="text-fg-muted text-sm sm:col-span-2" aria-live="polite">
            {t('wallet.topup.waiting')}
          </p>
        </div>
      )}
    </Modal>
  )
}
