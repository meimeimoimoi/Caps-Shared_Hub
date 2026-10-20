import type { CreditOverview } from '../types'

/* MOCK: dữ liệu minh họa cho dev demo */
const hour = 60 * 60 * 1000
const at = (offsetHours: number) =>
  new Date(Date.now() + offsetHours * hour).toISOString()

export const mockCreditOverview: CreditOverview = {
  wallet: { balance: 46, held: 1 },
  ledger: [
    {
      id: 'L-0009',
      entryType: 'AI_QUESTION',
      amount: -1,
      balanceAfter: 46,
      note: 'Khấu hao ô tô 4 chỗ',
      createdAt: at(-2),
    },
    {
      id: 'L-0008',
      entryType: 'EXPORT',
      amount: -1,
      balanceAfter: 47,
      note: 'Giải trình chi phí khấu hao ô tô 2025',
      createdAt: at(-5),
    },
    {
      id: 'L-0007',
      entryType: 'REFUND',
      amount: 1,
      balanceAfter: 48,
      note: 'Lỗi hệ thống sau khi tra cứu · hoàn 1 credit',
      createdAt: at(-26),
    },
    {
      id: 'L-0006',
      entryType: 'AI_QUESTION',
      amount: -1,
      balanceAfter: 47,
      note: 'Chi phí lãi vay',
      createdAt: at(-27),
    },
    {
      id: 'L-0005',
      entryType: 'AI_QUESTION',
      amount: -1,
      balanceAfter: 48,
      note: 'Chi phí phúc lợi cho nhân viên',
      createdAt: at(-50),
    },
    {
      id: 'L-0004',
      entryType: 'TOP_UP',
      amount: 50,
      balanceAfter: 49,
      createdAt: at(-72),
    },
  ],
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
