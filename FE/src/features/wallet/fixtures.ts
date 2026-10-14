/* Ví credit demo của client, theo bảng BE billing.CreditWallet / CreditLedger.
 * ponytail: dữ liệu tĩnh; thay bằng API ví khi BE mở endpoint. */

// RESTORE returns a captured credit after a platform failure (BR-C25)
export type LedgerType = 'TOPUP' | 'HOLD' | 'CAPTURE' | 'RELEASE' | 'RESTORE'

const daysAgo = (d: number) =>
  new Date(Date.now() - d * 86_400_000).toISOString()

// Cũ → mới; số dư sau giao dịch tính cộng dồn để không lệch tay
const ENTRIES: {
  type: LedgerType
  amount: number
  note: string
  at: string
}[] = [
  { type: 'TOPUP', amount: 30, note: 'Gói 30 · PayOS 8F2K41', at: daysAgo(12) },
  {
    type: 'CAPTURE',
    amount: -1,
    note: 'Câu hỏi trợ lý AI · chi phí lãi vay vượt ngưỡng',
    at: daysAgo(11),
  },
  {
    type: 'CAPTURE',
    amount: -1,
    note: 'Tải bản nháp DOCX · Quyết toán TNDN 2025',
    at: daysAgo(9),
  },
  {
    type: 'HOLD',
    amount: -1,
    note: 'Câu hỏi trợ lý AI · thuế nhà thầu nước ngoài',
    at: daysAgo(6),
  },
  {
    type: 'RELEASE',
    amount: 1,
    note: 'Ngoài phạm vi Thuế TNDN · hoàn credit giữ tạm',
    at: daysAgo(6),
  },
  {
    type: 'CAPTURE',
    amount: -1,
    note: 'Câu hỏi trợ lý AI · khấu hao TSCĐ thuê tài chính',
    at: daysAgo(4),
  },
  {
    type: 'CAPTURE',
    amount: -1,
    note: 'Câu hỏi trợ lý AI · chi phí quảng cáo',
    at: daysAgo(3),
  },
  {
    type: 'RESTORE',
    amount: 1,
    note: 'Lỗi hệ thống sau khi tra cứu · hoàn 1 credit',
    at: daysAgo(3),
  },
  {
    type: 'CAPTURE',
    amount: -1,
    note: 'Tải bản nháp PDF · Tạm nộp TNDN quý III/2026',
    at: daysAgo(2),
  },
  {
    type: 'HOLD',
    amount: -1,
    note: 'Câu hỏi trợ lý AI · đang xử lý',
    at: daysAgo(0.01),
  },
]

let running = 0
export const LEDGER = ENTRIES.map((e, i) => ({
  ...e,
  id: `L-${i + 1}`,
  balanceAfter: (running += e.amount),
})).reverse()

export const WALLET = {
  available: running,
  // HOLD chưa có RELEASE/CAPTURE tương ứng — ở demo là lần giữ cuối cùng
  held: 1,
}
