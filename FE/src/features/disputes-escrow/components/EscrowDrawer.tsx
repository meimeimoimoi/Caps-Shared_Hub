import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { CircleCheck, RotateCw, TriangleAlert } from 'lucide-react'
import { formatDateTime } from '@/lib/utils'
import { formatVnd } from '@/lib/format-money'
import { Drawer } from '@/components/ui/feedback/drawer'
import { TERMINATION_MATRIX } from '../constants'
import { escrowSplit } from '../utils/escrow'
import type { Escrow } from '../types'

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[10rem_minmax(0,1fr)] gap-3 py-2.5">
      <dt className="text-fg-muted">{label}</dt>
      <dd className="text-fg-strong">{children}</dd>
    </div>
  )
}

/* Chi tiết một khoản Escrow: tiền chia thế nào, đối soát (PayOS, tài khoản nhận), lý do lỗi, nhật ký */
export function EscrowDrawer({
  escrow: e,
  platformShare,
  retrying,
  onRetry,
  onMarkRefunded,
  onClose,
}: {
  escrow: Escrow
  platformShare: number
  retrying: boolean
  onRetry: () => void
  /** Reject → giữ form, hiện lỗi */
  onMarkRefunded: (ref: string) => Promise<unknown>
  onClose: () => void
}) {
  const { t } = useTranslation('admin')
  const split = escrowSplit(e, platformShare)
  const refundOpen =
    e.status === 'REFUND_PENDING' || e.status === 'REFUND_FAILED'
  // Bước 2 của "Đánh dấu đã hoàn": nhập mã giao dịch rồi xác nhận
  const [confirming, setConfirming] = useState(false)
  const [ref, setRef] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const confirmRefund = () => {
    if (!ref.trim()) return setError(t('escrow.refund.missingRef'))
    setBusy(true)
    setError(null)
    onMarkRefunded(ref.trim())
      .then(() => setConfirming(false))
      .catch((err: Error) => setError(err.message))
      .finally(() => setBusy(false))
  }
  // Chưa nghiệm thu thì số chia chỉ là dự kiến
  const pending = e.status === 'HELD' || e.status === 'DISPUTE_LOCKED'

  return (
    <Drawer
      title={t('escrow.drawer.title', { id: e.caseId })}
      onClose={onClose}
      footer={
        e.status === 'PAYOUT_FAILED' ? (
          <button
            type="button"
            onClick={onRetry}
            disabled={retrying || !e.failure?.retryable}
            className="btn btn-press btn-primary"
          >
            <RotateCw size={16} aria-hidden="true" />
            {retrying ? t('escrow.retrying') : t('escrow.retry')}
          </button>
        ) : refundOpen ? (
          confirming ? (
            <div className="w-full space-y-3">
              <div>
                <p className="text-fg-strong font-semibold">
                  {t('escrow.refund.title', {
                    amount: formatVnd(split.client),
                  })}
                </p>
                <p className="text-fg-muted mt-1 text-sm">
                  {t('escrow.refund.body', { account: e.refundAccount ?? '' })}
                </p>
              </div>
              <label className="flex flex-col gap-1.5 text-sm font-semibold">
                {t('escrow.refund.ref')}
                <input
                  value={ref}
                  onChange={(ev) => setRef(ev.target.value)}
                  className="border-border-control rounded-control shadow-control bg-paper h-control num border px-3 text-base font-normal"
                />
                <span className="text-fg-muted text-caption font-normal">
                  {t('escrow.refund.refHint')}
                </span>
              </label>
              {error && (
                <p role="alert" className="text-danger text-sm">
                  {error}
                </p>
              )}
              <div className="flex flex-wrap justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setConfirming(false)}
                  disabled={busy}
                  className="btn btn-press btn-secondary"
                >
                  {t('escrow.refund.cancel')}
                </button>
                <button
                  type="button"
                  onClick={confirmRefund}
                  disabled={busy}
                  className="btn btn-press btn-primary"
                >
                  {t('escrow.refund.confirm')}
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                setConfirming(true)
                setRef('')
                setError(null)
              }}
              className="btn btn-press btn-primary"
            >
              <CircleCheck size={16} aria-hidden="true" />
              {t('escrow.refund.mark')}
            </button>
          )
        ) : undefined
      }
    >
      <p className="text-fg-muted text-sm">
        {t('escrow.drawer.parties', { client: e.client, expert: e.expert })}
      </p>

      {e.failure && (
        <div
          role="alert"
          className="bg-danger-soft rounded-surface mt-4 flex gap-2 p-3 text-sm"
        >
          <TriangleAlert
            size={16}
            aria-hidden="true"
            className="text-danger mt-0.5 shrink-0"
          />
          <div>
            <p className="text-fg-strong font-semibold">
              {t('escrow.drawer.failure')}: {e.failure.reason}
            </p>
            {!e.failure.retryable && (
              <p className="text-fg-muted mt-1">
                {refundOpen
                  ? t('escrow.drawer.fixRefund')
                  : t('escrow.drawer.fixAccount')}
              </p>
            )}
          </div>
        </div>
      )}

      <h3 className="text-fg-strong mt-5 text-sm font-semibold">
        {t('escrow.drawer.split')}
        {pending && (
          <span className="text-fg-muted font-normal">
            {' '}
            · {t('escrow.drawer.expected')}
          </span>
        )}
      </h3>
      <dl className="divide-border-subtle num mt-1 divide-y text-sm">
        <Row label={t('escrow.drawer.total')}>{formatVnd(e.amount)}</Row>
        {split.client > 0 && (
          <Row label={t('escrow.drawer.toClient')}>
            {formatVnd(split.client)}
          </Row>
        )}
        <Row label={t('escrow.drawer.toExpert')}>{formatVnd(split.expert)}</Row>
        <Row label={t('escrow.drawer.toPlatform')}>
          {formatVnd(split.platform)}
        </Row>
      </dl>

      <dl className="divide-border-subtle mt-4 divide-y text-sm">
        <Row label={t('escrow.drawer.paidAt')}>
          <span className="num">{formatDateTime(e.paidAt)}</span>
        </Row>
        <Row label={t('escrow.drawer.payosRef')}>
          <span className="num break-all">{e.payosRef}</span>
        </Row>
        <Row label={t('escrow.drawer.account')}>{e.payoutAccount}</Row>
        {e.refundAccount && (
          <Row label={t('escrow.drawer.refundAccount')}>{e.refundAccount}</Row>
        )}
        {e.refundRef && (
          <Row label={t('escrow.drawer.refundRef')}>
            <span className="num break-all">{e.refundRef}</span>
          </Row>
        )}
        {e.termination && (
          <Row label={t('escrow.drawer.reason')}>
            {t(TERMINATION_MATRIX[e.termination].label)}
          </Row>
        )}
      </dl>

      {e.status === 'DISPUTE_LOCKED' && (
        <Link
          to={`/admin/disputes/${e.caseId}`}
          className="text-accent-text mt-3 inline-block text-sm underline underline-offset-4"
        >
          {t('escrow.drawer.dispute')}
        </Link>
      )}

      <h3 className="text-fg-strong mt-6 text-sm font-semibold">
        {t('escrow.drawer.history')}
      </h3>
      <ol className="mt-2 space-y-2 text-sm">
        {e.history.map((h) => (
          <li
            key={h.at + h.text}
            className="grid grid-cols-[7.5rem_minmax(0,1fr)] gap-3"
          >
            <span className="text-fg-muted num">{formatDateTime(h.at)}</span>
            <span>
              <span className="text-fg-strong">{h.actor}</span> · {h.text}
            </span>
          </li>
        ))}
      </ol>
    </Drawer>
  )
}
