import { useMemo, useState } from 'react'
import { isExpertDemo } from '@/lib/expert-data-source'
import { useExpertPresentation } from '@/features/expert-dashboard/hooks/useExpertPresentation'
import { BankAccountsSection } from '@/features/bank-accounts/components/BankAccountsSection'
import { useTranslation } from 'react-i18next'
import { PageHeader } from '@/components/ui/layout/page-header'
import { EmptyState } from '@/components/ui/feedback/empty-state'
import { DemoBanner } from '@/components/ui/feedback/demo-banner'
import { SortableTh } from '@/components/ui/navigation/sortable-th'
import { TablePager } from '@/components/ui/navigation/table-pager'
import { sortRows, type TableSort } from '@/lib/table-sort'
import { paginate } from '@/lib/pagination'

import {
  ArrowDownRight,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  DollarSign,
} from 'lucide-react'

type TransactionStatus = 'pending' | 'cleared' | 'withdrawn'

interface Transaction {
  id: string
  date: string
  desc: string
  amount: number
  status: TransactionStatus
}

const PAGE_SIZE = 10

export default function ExpertIncomePage() {
  const display = useExpertPresentation()
  const { t } = useTranslation('expert')
  const [sort, setSort] = useState<TableSort>({ key: 'date', direction: 'desc' })
  const [page, setPage] = useState(0)

  // Demo figures only; real income data is not connected yet
  const transactions = useMemo<Transaction[]>(
    () => [
      { id: 'TRX-9482', date: '2026-10-04', desc: t('caseCompletion', { id: 'RC-1042' }), amount: 1_600_000, status: 'pending' },
      { id: 'TRX-9471', date: '2026-10-02', desc: t('caseCompletion', { id: 'RC-0931' }), amount: 1_600_000, status: 'cleared' },
      { id: 'TRX-9405', date: '2026-09-28', desc: t('withdrawalToBankAccount'), amount: -8_000_000, status: 'withdrawn' },
      { id: 'TRX-9382', date: '2026-09-15', desc: t('caseCompletion', { id: 'RC-0811' }), amount: 2_400_000, status: 'cleared' },
      { id: 'TRX-9350', date: '2026-09-10', desc: t('caseCompletion', { id: 'RC-0792' }), amount: 1_800_000, status: 'cleared' },
    ],
    [t]
  )

  const sorted = useMemo(
    () =>
      sortRows(
        transactions,
        (row) => (sort.key === 'amount' ? row.amount : sort.key === 'id' ? row.id : row.date),
        sort.direction
      ),
    [transactions, sort]
  )
  const paged = paginate(sorted, page, PAGE_SIZE)

  if (!isExpertDemo) {
    return (
      <>
        <PageHeader title={t('income')} className="mb-6" />
        <EmptyState title={t('incomeUnavailable')}>
          {t('incomeUnavailableMessage')}
        </EmptyState>
      </>
    )
  }

  const clearingCount = transactions.filter((x) => x.status === 'pending').length

  // Only the first card shows a real trend; the others are plain context, so they stay neutral
  const stats = [
    {
      label: t('availableForWithdrawal'),
      value: 12_450_000,
      icon: DollarSign,
      note: t('incomeThisMonth', {
        amount: display.money(4_500_000, { showPositiveSign: true }),
      }),
      isTrend: true,
    },
    {
      label: t('pendingClearance'),
      value: 3_200_000,
      icon: Clock,
      note: t('transactionsClearing', { count: clearingCount }),
      isTrend: false,
    },
    {
      label: t('lifetimeEarnings'),
      value: 48_900_000,
      icon: ArrowUpRight,
      note: t('updatedToday'),
      isTrend: false,
    },
  ]

  const statusText: Record<TransactionStatus, string> = {
    pending: t('clearing'),
    cleared: t('cleared'),
    withdrawn: t('withdrawn'),
  }

  const onSort = (key: string) => {
    setSort((prev) => ({
      key,
      direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc',
    }))
    setPage(0)
  }

  return (
    <>
      <PageHeader title={t('income')} className="mb-4" />
      <div className="mb-6">
        <DemoBanner>
          <p>{t('incomeDemoNotice')}</p>
        </DemoBanner>
      </div>

      <div className="ep-services-overview">
        <div className="ep-perf-grid grid-cols-1! sm:grid-cols-3!">
          {stats.map((stat, i) => (
            <div
              key={stat.label}
              className={`ep-perf-card ${i === 0 ? 'ep-perf-highlight' : ''}`}
            >
              <div className="ep-perf-card-top">
                <stat.icon size={16} aria-hidden="true" /> <span>{stat.label}</span>
              </div>
              <div className="ep-perf-value tabular-nums">{display.money(stat.value)}</div>
              <div
                className={`ep-perf-trend ${stat.isTrend ? 'ep-trend-up' : 'ep-text-muted'}`}
              >
                {stat.note}
              </div>
            </div>
          ))}
        </div>
      </div>

      <BankAccountsSection />

      <div className="ep-cases-toolbar mt-8">
        <h2 className="text-h3">{t('transactionHistory')}</h2>
      </div>

      {/* Table on wide screens */}
      <div className="ep-cases-table-wrapper max-md:hidden">
        <table className="ep-cases-table">
          <thead>
            <tr>
              <SortableTh column="id" sort={sort} onSort={onSort}>
                {t('transactionId')}
              </SortableTh>
              <SortableTh column="date" sort={sort} onSort={onSort}>
                {t('date')}
              </SortableTh>
              <th scope="col">{t('description')}</th>
              <SortableTh column="amount" sort={sort} onSort={onSort} className="text-right">
                {t('amount')}
              </SortableTh>
              <th scope="col">{t('status')}</th>
            </tr>
          </thead>
          <tbody>
            {paged.rows.map((trx) => (
              <tr key={trx.id}>
                <td>
                  <span className="ep-resource-id font-mono text-xs">{trx.id}</span>
                </td>
                <td>
                  <time dateTime={trx.date} className="text-xs text-[var(--ep-muted)]">
                    {display.dateOnly(trx.date)}
                  </time>
                </td>
                <td className="text-xs font-medium">{trx.desc}</td>
                <td className="text-right">
                  <Amount value={trx.amount} format={display.money} />
                </td>
                <td>
                  <StatusPill status={trx.status} text={statusText[trx.status]} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Cards on small screens */}
      <ul className="flex flex-col gap-3 md:hidden">
        {paged.rows.map((trx) => (
          <li
            key={trx.id}
            className="rounded-lg border border-[var(--ep-line)] bg-[var(--ep-surface)] p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <span className="text-sm font-medium">{trx.desc}</span>
              <Amount value={trx.amount} format={display.money} />
            </div>
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--ep-muted)]">
              <span>
                <span className="font-mono">{trx.id}</span> ·{' '}
                <time dateTime={trx.date}>{display.dateOnly(trx.date)}</time>
              </span>
              <StatusPill status={trx.status} text={statusText[trx.status]} />
            </div>
          </li>
        ))}
      </ul>

      <TablePager
        paged={paged}
        onPrev={() => setPage((p) => p - 1)}
        onNext={() => setPage((p) => p + 1)}
        onPageChange={(next) => setPage(next - 1)}
      />
    </>
  )
}

function Amount({
  value,
  format,
}: {
  value: number
  format: (value: number, options?: { showPositiveSign?: boolean }) => string
}) {
  return (
    <span
      className={`text-sm font-semibold whitespace-nowrap tabular-nums ${value > 0 ? 'text-[var(--ep-success)]' : ''}`}
    >
      {format(value, { showPositiveSign: true })}
    </span>
  )
}

function StatusPill({ status, text }: { status: TransactionStatus; text: string }) {
  return (
    <span
      className={`ep-status ${status === 'pending' ? 'ep-status-paused' : 'ep-status-ready'}`}
    >
      {status === 'cleared' && <CheckCircle2 size={12} aria-hidden="true" />}
      {status === 'withdrawn' && <ArrowDownRight size={12} aria-hidden="true" />}
      {status === 'pending' && <Clock size={12} aria-hidden="true" />}
      {text}
    </span>
  )
}
