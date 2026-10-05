import { formatVnd } from '@/shared/lib/format-money'
import { ArrowDownRight, ArrowUpRight, CheckCircle2, Clock, DollarSign, DownloadCloud } from 'lucide-react'

export default function ExpertIncomePage() {
  const stats = [
    { label: 'Available for withdrawal', value: 12_450_000, icon: DollarSign, trend: `${formatVnd(4_500_000, { showPositiveSign: true })} this month`, trendUp: true },
    { label: 'Pending clearance', value: 3_200_000, icon: Clock, trend: '2 transactions clearing', trendUp: true },
    { label: 'Lifetime earnings', value: 48_900_000, icon: ArrowUpRight, trend: 'Updated today', trendUp: true }
  ]

  const transactions = [
    { id: 'TRX-9482', date: '04 Oct 2026', desc: 'Case completion (RC-1042)', amount: 1_600_000, status: 'pending', statusText: 'Clearing' },
    { id: 'TRX-9471', date: '02 Oct 2026', desc: 'Case completion (RC-0931)', amount: 1_600_000, status: 'cleared', statusText: 'Cleared' },
    { id: 'TRX-9405', date: '28 Sep 2026', desc: 'Withdrawal to bank account', amount: -8_000_000, status: 'withdrawn', statusText: 'Withdrawn' },
    { id: 'TRX-9382', date: '15 Sep 2026', desc: 'Case completion (RC-0811)', amount: 2_400_000, status: 'cleared', statusText: 'Cleared' },
    { id: 'TRX-9350', date: '10 Sep 2026', desc: 'Case completion (RC-0792)', amount: 1_800_000, status: 'cleared', statusText: 'Cleared' }
  ]

  return <>
    <div className="ep-page-heading">
      <div>
        <h1>Income</h1>
        <p>Manage your earnings, view transaction history, and withdraw funds.</p>
      </div>
      <div className="ep-heading-actions">
        <button className="ep-button ep-button-primary">
          Withdraw Funds
        </button>
      </div>
    </div>
    
    <div className="ep-services-overview">
      <div className="ep-perf-grid" style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }}>
        {stats.map((stat, i) => (
          <div key={i} className={`ep-perf-card ${i === 0 ? 'ep-perf-highlight' : ''}`}>
            <div className="ep-perf-card-top">
              <stat.icon size={16} /> <span>{stat.label}</span>
            </div>
            <div className="ep-perf-value">{formatVnd(stat.value)}</div>
            <div className={`ep-perf-trend ${stat.trendUp ? 'ep-trend-up' : 'ep-trend-down'} ${i !== 0 ? 'ep-text-muted' : ''}`}>
              {stat.trend}
            </div>
          </div>
        ))}
      </div>
    </div>

    <div className="ep-cases-toolbar mt-8">
      <h3>Transaction History</h3>
      <div className="ep-heading-actions">
        <button className="ep-button">
          <DownloadCloud size={16} /> Export CSV
        </button>
      </div>
    </div>

    <div className="ep-cases-table-wrapper">
      <table className="ep-cases-table">
        <thead>
          <tr>
            <th>Transaction ID</th>
            <th>Date</th>
            <th>Description</th>
            <th>Amount</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {transactions.map(trx => (
            <tr key={trx.id}>
              <td>
                <span className="ep-resource-id font-mono text-xs">{trx.id}</span>
              </td>
              <td>
                <time className="text-xs text-[var(--ep-muted)]">{trx.date}</time>
              </td>
              <td className="font-medium text-xs">
                {trx.desc}
              </td>
              <td>
                <span className={`font-semibold text-sm ${trx.amount > 0 ? 'text-[var(--ep-success)]' : ''}`}>
                  {formatVnd(trx.amount, { showPositiveSign: true })}
                </span>
              </td>
              <td>
                <span className={`ep-status ${trx.status === 'cleared' || trx.status === 'withdrawn' ? 'ep-status-ready' : 'ep-status-paused'}`}>
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
}
