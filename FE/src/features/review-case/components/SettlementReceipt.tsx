import { useTranslation } from 'react-i18next'
import { SETTLEMENT_POLICY, settle } from '../settlement'
import type { ReviewCase } from '../types'
import { useCaseFormat } from '../ui'

/* Biên nhận quyết toán: một rule duy nhất / case, tổng 3 phần luôn bằng số đã thanh toán */
export function SettlementReceipt({
  amount,
  settlement,
}: {
  amount: number
  settlement: NonNullable<ReviewCase['settlement']>
}) {
  const { t } = useTranslation('reviewCase')
  const f = useCaseFormat()
  const { type, split } = SETTLEMENT_POLICY[settlement.rule]
  const money = settle(amount, settlement.rule)
  const parts = [
    { key: 'refund', pct: split[0], value: money.refund, swatch: 'bg-success' },
    { key: 'expert', pct: split[1], value: money.expert, swatch: 'bg-ink' },
    {
      key: 'platform',
      pct: split[2],
      value: money.platform,
      swatch: 'bg-border-control',
    },
  ] as const

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

      <div
        aria-hidden="true"
        className="bg-track mt-6 flex h-2 gap-0.5 overflow-hidden rounded-full"
      >
        {parts.map(
          (p) =>
            p.pct > 0 && (
              <span
                key={p.key}
                className={p.swatch}
                style={{ width: `${p.pct}%` }}
              />
            )
        )}
      </div>

      <dl className="mt-5">
        {parts.map((p) => (
          <div
            key={p.key}
            className="border-border-subtle flex items-center justify-between gap-4 border-b py-3"
          >
            <dt className="flex items-center gap-2.5">
              <span
                aria-hidden="true"
                className={`${p.swatch} size-2.5 rounded-full`}
              />
              {t(`settlement.${p.key}`)}
              <span className="num text-fg-muted text-sm">{p.pct}%</span>
            </dt>
            <dd className="num text-fg-strong font-semibold">
              {f.money(p.value)}
            </dd>
          </div>
        ))}
        <div className="border-border-strong flex items-center justify-between gap-4 border-t-2 pt-3">
          <dt className="text-fg-strong font-semibold">
            {t('settlement.gross')}
          </dt>
          <dd className="num text-fg-strong text-h2 font-semibold">
            {f.money(money.gross)}
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
