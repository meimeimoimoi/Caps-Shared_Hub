import { useExpertPresentation } from '@/features/expert-dashboard/hooks/useExpertPresentation'
import { useTranslation } from 'react-i18next'

import {
  ArrowDownRight,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  DollarSign,
  DownloadCloud,
} from 'lucide-react'

export default function ExpertIncomePage() {
  const display = useExpertPresentation()

  const { t } = useTranslation('expert')

  const stats = [
    {
      label: t('availableForWithdrawal'),
      value: 12_450_000,
      icon: DollarSign,
      trend: t('incomeThisMonth', {
        amount: display.money(4_500_000, { showPositiveSign: true }),
      }),
      trendUp: true,
    },
    {
      label: t('pendingClearance'),
      value: 3_200_000,
      icon: Clock,
      trend: t('2TransactionsClearing'),
      trendUp: true,
    },
    {
      label: t('lifetimeEarnings'),
      value: 48_900_000,
      icon: ArrowUpRight,
      trend: t('updatedToday'),
      trendUp: true,
    },
  ]

  const transactions = [
    {
      id: 'TRX-9482',
      date: '2026-10-04',
      desc: t('caseCompletion', { id: 'RC-1042' }),
      amount: 1_600_000,
      status: 'pending',
      statusText: t('clearing'),
    },
    {
      id: 'TRX-9471',
      date: '2026-10-02',
      desc: t('caseCompletion', { id: 'RC-0931' }),
      amount: 1_600_000,
      status: 'cleared',
      statusText: t('cleared'),
    },
    {
      id: 'TRX-9405',
      date: '2026-09-28',
      desc: t('withdrawalToBankAccount'),
      amount: -8_000_000,
      status: 'withdrawn',
      statusText: t('withdrawn'),
    },
    {
      id: 'TRX-9382',
      date: '2026-09-15',
      desc: t('caseCompletion', { id: 'RC-0811' }),
      amount: 2_400_000,
      status: 'cleared',
      statusText: t('cleared'),
    },
    {
      id: 'TRX-9350',
      date: '2026-09-10',
      desc: t('caseCompletion', { id: 'RC-0792' }),
      amount: 1_800_000,
      status: 'cleared',
      statusText: t('cleared'),
    },
  ]

  return (
    <>
      <div className="ep-page-heading">
        <div>
          <h1>{t('income')}</h1>
          <p>{t('manageYourEarningsViewTransactionHistoryAndWithdrawFunds')}</p>
        </div>
        <div className="ep-heading-actions">
          <button className="ep-button ep-button-primary">
            {t('withdrawFunds')}
          </button>
        </div>
      </div>

      <div className="ep-services-overview">
        <div
          className="ep-perf-grid"
          style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }}
        >
          {stats.map((stat, i) => (
            <div
              key={i}
              className={`ep-perf-card ${i === 0 ? 'ep-perf-highlight' : ''}`}
            >
              <div className="ep-perf-card-top">
                <stat.icon size={16} /> <span>{stat.label}</span>
              </div>
              <div className="ep-perf-value">{display.money(stat.value)}</div>
              <div
                className={`ep-perf-trend ${stat.trendUp ? 'ep-trend-up' : 'ep-trend-down'} ${i !== 0 ? 'ep-text-muted' : ''}`}
              >
                {stat.trend}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="ep-cases-toolbar mt-8">
        <h3>{t('transactionHistory')}</h3>
        <div className="ep-heading-actions">
          <button className="ep-button">
            <DownloadCloud size={16} />
            {t('exportCsv')}
          </button>
        </div>
      </div>

      <div className="ep-cases-table-wrapper">
        <table className="ep-cases-table">
          <thead>
            <tr>
              <th>{t('transactionId')}</th>
              <th>{t('date')}</th>
              <th>{t('description')}</th>
              <th>{t('amount')}</th>
              <th>{t('status')}</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((trx) => (
              <tr key={trx.id}>
                <td>
                  <span className="ep-resource-id font-mono text-xs">
                    {trx.id}
                  </span>
                </td>
                <td>
                  <time
                    dateTime={trx.date}
                    className="text-xs text-[var(--ep-muted)]"
                  >
                    {display.dateOnly(trx.date)}
                  </time>
                </td>
                <td className="text-xs font-medium">{trx.desc}</td>
                <td>
                  <span
                    className={`text-sm font-semibold ${trx.amount > 0 ? 'text-[var(--ep-success)]' : ''}`}
                  >
                    {display.money(trx.amount, { showPositiveSign: true })}
                  </span>
                </td>
                <td>
                  <span
                    className={`ep-status ${trx.status === 'cleared' || trx.status === 'withdrawn' ? 'ep-status-ready' : 'ep-status-paused'}`}
                  >
                    {trx.status === 'cleared' && <CheckCircle2 size={12} />}
                    {trx.status === 'withdrawn' && <ArrowDownRight size={12} />}
                    {trx.status === 'pending' && <Clock size={12} />}
                    {trx.statusText}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
