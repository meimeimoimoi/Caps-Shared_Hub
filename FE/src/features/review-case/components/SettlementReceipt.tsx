import { useTranslation } from 'react-i18next'
import { SETTLEMENT_POLICY, settle } from '../settlement'
import type { ReviewCase } from '../types'
import { useCaseFormat } from '../ui'

/* The client's settlement receipt: what came back to them out of what they paid. The expert's and the
   platform's shares are internal and never shown here. */
export function SettlementReceipt({
  amount,
  settlement,
}: {
  amount: number
  settlement: NonNullable<ReviewCase['settlement']>
}) {
  const { t } = useTranslation('reviewCase')
  const f = useCaseFormat()
  const { type } = SETTLEMENT_POLICY[settlement.rule]
  // The backend's settled refund wins; the policy split is only an estimate for fixture cases
  const refund = settlement.amounts
    ? (settlement.amounts.clientRefund ?? 0)
    : settle(amount, settlement.rule).refund

  return (
    <section className="paper p-6 md:p-8" aria-labelledby="settlement-title">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">{t(`settlement.types.${type}`)}</p>
          <h2 id="settlement-title" className="text-h2 mt-1 font-serif">
            {t('settlement.title')}
          </h2>
        </div>
        <p className="num text-fg-muted text-sm">{settlement.ref}</p>
      </div>

      <dl className="mt-5">
        <div className="border-border-subtle flex items-center justify-between gap-4 border-b py-3">
          <dt>{t('settlement.refund')}</dt>
          <dd className="num text-fg-strong font-semibold">{f.money(refund)}</dd>
        </div>
        <div className="border-border-strong flex items-center justify-between gap-4 border-t-2 pt-3">
          <dt className="text-fg-strong font-semibold">
            {t('settlement.gross')}
          </dt>
          <dd className="num text-fg-strong text-h2 font-semibold">
            {f.money(amount)}
          </dd>
        </div>
      </dl>

      <dl className="mt-6 grid gap-x-8 gap-y-3 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-fg-muted">{t('settlement.policy')}</dt>
          <dd className="text-fg-strong mt-0.5">
            {t(`settlement.rules.${settlement.rule}`)}
          </dd>
        </div>
        <div>
          <dt className="text-fg-muted">{t('settlement.settledAt')}</dt>
          <dd className="num text-fg-strong mt-0.5">
            {f.at(settlement.settledAt)}
          </dd>
        </div>
      </dl>
      <p className="text-fg-muted text-caption mt-5">{t('settlement.once')}</p>
    </section>
  )
}
