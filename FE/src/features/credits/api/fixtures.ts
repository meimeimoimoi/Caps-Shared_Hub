import { LEDGER, WALLET } from '@/features/wallet/fixtures'
import type { CreditOverview } from '../types'

/* MOCK: dữ liệu minh họa cho dev demo */
const hour = 60 * 60 * 1000
const at = (offsetHours: number) =>
  new Date(Date.now() + offsetHours * hour).toISOString()

export const mockCreditOverview: CreditOverview = {
  wallet: { balance: WALLET.available, held: WALLET.held },
  ledger: LEDGER.map(({ id, type, amount, balanceAfter, note, at }) => ({
    id,
    entryType: type,
    amount,
    balanceAfter,
    note,
    createdAt: at,
  })),
  payments: [
    {
      id: 'P-0004',
      purpose: 'REVIEW_FEE',
      amount: 1_500_000,
      orderCode: '2410180932',
      status: 'SUCCEEDED',
      createdAt: at(-140),
    },
    {
      id: 'P-0003',
      purpose: 'CREDIT_TOP_UP',
      amount: 250_000,
      orderCode: '2410151120',
      status: 'SUCCEEDED',
      createdAt: at(-72),
    },
    {
      id: 'P-0002',
      purpose: 'CREDIT_TOP_UP',
      amount: 250_000,
      orderCode: '2410151114',
      status: 'CANCELLED',
      createdAt: at(-72.2),
    },
  ],
}
