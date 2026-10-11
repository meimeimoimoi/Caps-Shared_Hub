import { useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { ShieldCheck } from 'lucide-react'
import { mockPricing } from '@/features/service-pricing/api/fixtures'
import { DEMO_CASES, demoCase } from '@/features/review-case/fixtures'
import { fundsOf, useCaseFormat } from '@/features/review-case/ui'
import { LEDGER, WALLET } from '@/features/wallet/fixtures'
import { cn } from '@/lib/utils'

/* Ví & credit của client: số dư, gói nạp + đơn giá (cấu hình Admin), sổ credit, phí thẩm định đang giữ hộ.
 * ponytail: gói/đơn giá đọc thẳng từ fixture Admin; cần endpoint công khai khi BE có. */
export default function WalletPage() {
  const { t } = useTranslation('reviewCase')
  const f = useCaseFormat()
  const { creditPackages, creditRates } = mockPricing
  const held = useMemo(
    () =>
      DEMO_CASES.map((d) => demoCase(d.id)!).filter((c) =>
        ['held', 'locked'].includes(fundsOf(c))
      ),
    []
  )

  useEffect(() => {
    document.title = `${t('nav.wallet')} | Shared Hub`
  }, [t])

  return (
    <>
      <h1 className="text-h1 font-serif">{t('nav.wallet')}</h1>
      <p className="text-fg-muted mt-2 max-w-[65ch]">{t('wallet.lead')}</p>

      <section
        aria-label={t('wallet.available')}
        className="paper mt-8 grid gap-6 p-6 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] md:p-8"
      >
        <div>
          <p className="eyebrow">{t('wallet.available')}</p>
          <p className="num text-fg-strong mt-1 text-[3rem] leading-none font-semibold tracking-tight">
            {WALLET.available}
          </p>
          <p className="text-fg-muted mt-1 text-sm">
            {t('wallet.unit', { count: WALLET.available })}
          </p>
        </div>
        <div className="sm:border-border sm:border-l sm:pl-6">
          <p className="eyebrow">{t('wallet.held')}</p>
          <p className="num text-fg-strong text-h2 mt-1 font-semibold">
            {t('wallet.unit', { count: WALLET.held })}
          </p>
          <p className="text-fg-muted mt-1 text-sm">{t('wallet.heldHint')}</p>
        </div>
      </section>

      <div className="mt-10 grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="min-w-0 space-y-10">
          <section aria-labelledby="w-packages">
            <h2 id="w-packages" className="text-h2">
              {t('wallet.packages')}
            </h2>
            <ul className="mt-4 grid gap-4 sm:grid-cols-3">
              {[...creditPackages]
                .filter((p) => p.onSale)
                .sort((a, b) => a.order - b.order)
                .map((p) => (
                  <li
                    key={p.id}
                    className={cn(
                      'paper flex flex-col p-5',
                      p.recommended && 'ring-indicator ring-2'
                    )}
                  >
                    <p className="text-fg-strong flex items-center justify-between gap-2 font-semibold">
                      {p.name}
                      {p.recommended && (
                        <span className="text-accent-text text-caption font-bold uppercase">
                          {t('wallet.recommended')}
                        </span>
                      )}
                    </p>
                    <p className="num text-fg-strong text-h2 mt-3 font-semibold">
                      {t('wallet.unit', { count: p.credits })}
                    </p>
                    <p className="text-fg-muted num text-sm">
                      {p.price == null
                        ? t('wallet.priceTbd')
                        : f.money(p.price)}
                    </p>
                    <button
                      type="button"
                      disabled={p.price == null}
                      title={
                        p.price == null ? t('wallet.buyUnavailable') : undefined
                      }
                      className="btn btn-press btn-primary mt-5"
                    >
                      {t('wallet.buy')}
                    </button>
                  </li>
                ))}
            </ul>
            {creditPackages.every((p) => p.price == null) && (
              <p className="text-fg-muted mt-3 text-sm">
                {t('wallet.buyUnavailable')}
              </p>
            )}
          </section>

          <section aria-labelledby="w-ledger">
            <h2 id="w-ledger" className="text-h2">
              {t('wallet.ledger')}
            </h2>
            <div className="paper mt-4 overflow-x-auto">
              <table className="w-full text-sm sm:min-w-[36rem]">
                <thead className="bg-sunken text-fg-muted text-left">
                  <tr className="[&>th]:px-4 [&>th]:py-3 [&>th]:font-semibold [&>th]:whitespace-nowrap">
                    <th scope="col" className="max-sm:hidden">
                      {t('wallet.ledgerCols.date')}
                    </th>
                    <th scope="col">{t('wallet.ledgerCols.entry')}</th>
                    <th scope="col" className="text-right">
                      {t('wallet.ledgerCols.amount')}
                    </th>
                    <th scope="col" className="text-right">
                      {t('wallet.ledgerCols.balance')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {LEDGER.map((e) => (
                    <tr
                      key={e.id}
                      className="border-border-subtle border-t [&>td]:px-4 [&>td]:py-3"
                    >
                      <td className="num text-fg-muted whitespace-nowrap max-sm:hidden">
                        {f.at(e.at)}
                      </td>
                      <td>
                        <span className="text-fg-strong font-semibold">
                          {t(`wallet.types.${e.type}`)}
                        </span>
                        <span className="text-fg-muted block">{e.note}</span>
                        <span className="num text-fg-muted block text-xs sm:hidden">
                          {f.at(e.at)}
                        </span>
                      </td>
                      <td
                        className={cn(
                          'num text-right font-semibold',
                          e.amount > 0 ? 'text-success' : 'text-fg-strong'
                        )}
                      >
                        {e.amount > 0 ? `+${e.amount}` : e.amount}
                      </td>
                      <td className="num text-fg-muted text-right">
                        {e.balanceAfter}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <aside className="min-w-0 space-y-8">
          <section
            aria-labelledby="w-rates"
            className="border-border border-t pt-5"
          >
            <h2 id="w-rates" className="eyebrow font-sans">
              {t('wallet.rates')}
            </h2>
            <dl className="mt-3">
              {creditRates.map((r) => (
                <div
                  key={r.id}
                  className="border-border-subtle flex items-start justify-between gap-4 border-b py-3 text-sm"
                >
                  <dt>
                    <span className="text-fg-strong block">{r.action}</span>
                    <span className="text-fg-muted block">{r.when}</span>
                  </dt>
                  <dd className="num text-fg-strong shrink-0 font-semibold">
                    {r.credits == null
                      ? t('wallet.tbd')
                      : r.credits === 0
                        ? t('wallet.free')
                        : t('wallet.unit', { count: r.credits })}
                  </dd>
                </div>
              ))}
            </dl>
          </section>

          <section
            aria-labelledby="w-escrow"
            className="border-border border-t pt-5"
          >
            <h2 id="w-escrow" className="eyebrow font-sans">
              {t('wallet.escrow')}
            </h2>
            {held.length === 0 ? (
              <p className="text-fg-muted mt-3 text-sm">
                {t('wallet.escrowEmpty')}
              </p>
            ) : (
              <ul className="mt-3">
                {held.map((c) => (
                  <li
                    key={c.id}
                    className="border-border-subtle border-b py-3 text-sm"
                  >
                    <Link
                      to={`/cases/${c.id}`}
                      className="hover:text-accent-text flex justify-between gap-4"
                    >
                      <span className="min-w-0">
                        <span className="num text-fg-strong block font-semibold">
                          {c.id}
                        </span>
                        <span className="text-fg-muted block truncate">
                          {t(`status.${c.status}`)}
                        </span>
                      </span>
                      <span className="num text-fg-strong shrink-0 font-semibold">
                        {f.money(c.amount)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            <p className="text-fg-muted mt-3 flex items-start gap-2 text-sm">
              <ShieldCheck
                size={15}
                aria-hidden="true"
                className="text-success mt-0.5 shrink-0"
              />
              {t('wallet.escrowNote')}
            </p>
          </section>
        </aside>
      </div>
    </>
  )
}
