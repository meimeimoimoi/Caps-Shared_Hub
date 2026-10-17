/* MOCK: số liệu minh họa 12 tháng gần nhất cho dashboard System Admin.
 * TODO(api): thay bằng API thống kê của BE; số ở đây không phải số thật. */
import type { Granularity, StatPeriod } from '../types'

// Giá trị giao dịch và hoàn tiền mỗi tháng (triệu VND), cũ nhất trước
const GMV = [31.6, 34.2, 29.8, 38.5, 42.1, 40.7, 47.9, 52.3, 49.6, 55.8, 61.2, 58.4]
const REFUNDS = [1.9, 2.4, 3.1, 2.2, 2.6, 3.4, 2.9, 3.8, 3.1, 4.2, 3.6, 4.5]
const NEW_CLIENTS = [41, 46, 39, 52, 58, 55, 63, 71, 66, 74, 82, 77]
const NEW_EXPERTS = [3, 4, 2, 5, 4, 6, 5, 7, 4, 6, 8, 5]
const USERS_BEFORE = 612

/** 12 tháng kết thúc ở tháng hiện tại */
export function mockMonths(now = new Date()): StatPeriod[] {
  let total = USERS_BEFORE
  return GMV.map((gmv, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (GMV.length - 1 - i), 1)
    const net = (gmv - REFUNDS[i]) * 1_000_000
    total += NEW_CLIENTS[i] + NEW_EXPERTS[i]
    return {
      start: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`,
      expertPayout: Math.round((net * 0.8) / 1000) * 1000,
      platformFee: Math.round((net * 0.2) / 1000) * 1000,
      refunds: REFUNDS[i] * 1_000_000,
      newClients: NEW_CLIENTS[i],
      newExperts: NEW_EXPERTS[i],
      totalUsers: total,
      // Tháng hiện tại chưa hết
      partial: i === GMV.length - 1,
    }
  })
}

/** Gộp các tháng thành quý: cộng dồn số theo kỳ, tổng người dùng lấy cuối quý.
 * Quý đầu thiếu tháng (dữ liệu không đủ) bị bỏ; quý cuối chưa đủ 3 tháng là kỳ đang dở. */
export function toQuarters(months: StatPeriod[]): StatPeriod[] {
  const byKey = new Map<string, StatPeriod & { months: number }>()
  for (const m of months) {
    const [y, mm] = m.start.split('-').map(Number)
    const q = Math.floor((mm - 1) / 3) + 1
    const key = `${y}-Q${q}`
    const cur = byKey.get(key)
    if (!cur) {
      byKey.set(key, { ...m, start: `${y}-${String((q - 1) * 3 + 1).padStart(2, '0')}-01`, quarter: q, months: 1 })
      continue
    }
    cur.expertPayout += m.expertPayout
    cur.platformFee += m.platformFee
    cur.refunds += m.refunds
    cur.newClients += m.newClients
    cur.newExperts += m.newExperts
    cur.totalUsers = m.totalUsers
    cur.partial = cur.partial || m.partial
    cur.months += 1
  }
  const quarters = [...byKey.values()]
  const first = quarters[0]
  if (first && first.months < 3) quarters.shift() // thiếu dữ liệu đầu kỳ, không phải số thật của quý
  return quarters.map(({ months: n, ...p }) => ({ ...p, partial: p.partial || n < 3 }))
}

export function mockStats(granularity: Granularity, now = new Date()): StatPeriod[] {
  const months = mockMonths(now)
  return granularity === 'month' ? months : toQuarters(months)
}
