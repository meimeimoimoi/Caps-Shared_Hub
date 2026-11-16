/* MOCK: sample figures for the System Admin dashboard, only when VITE_EXPERT_DATA_SOURCE=mock.
 * Shaped like the stats APIs of auth, billing and expert; none of these numbers are real. */
import type { BillingStats, ExpertStats, UserStats } from '../types'

// Transaction value and refunds per month (million VND), oldest first
const GMV = [31.6, 34.2, 29.8, 38.5, 42.1, 40.7, 47.9, 52.3, 49.6, 55.8, 61.2, 58.4]
const REFUNDS = [1.9, 2.4, 3.1, 2.2, 2.6, 3.4, 2.9, 3.8, 3.1, 4.2, 3.6, 4.5]
const NEW_USERS = [44, 50, 41, 57, 62, 61, 68, 78, 70, 80, 90, 82]
const NEW_EXPERTS = [3, 4, 2, 5, 4, 6, 5, 7, 4, 6, 8, 5]
const USERS_BEFORE = 612

/** The last `count` months ending with the current one; sample values repeat when count > 12 */
function lastMonths(count: number, now = new Date()) {
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (count - 1 - i), 1)
    return {
      start: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`,
      partial: i === count - 1,
      // The current month always uses the last sample
      sample: (((i - count) % 12) + 12) % 12,
    }
  })
}

export function mockUserStats(months: number): UserStats {
  let total = USERS_BEFORE
  return {
    periods: lastMonths(months).map(({ sample, ...m }) => {
      total += NEW_USERS[sample]
      return { ...m, newUsers: NEW_USERS[sample], totalUsers: total }
    }),
  }
}

export function mockBillingStats(months: number): BillingStats {
  return {
    periods: lastMonths(months).map(({ sample, ...m }) => {
      const net = (GMV[sample] - REFUNDS[sample]) * 1_000_000
      return {
        ...m,
        expertPayout: Math.round((net * 0.8) / 1000) * 1000,
        platformFee: Math.round((net * 0.2) / 1000) * 1000,
        refunds: REFUNDS[sample] * 1_000_000,
      }
    }),
    escrows: [
      { status: 'HELD', count: 12, amount: 8_400_000 },
      { status: 'RELEASED', count: 140, amount: 96_000_000 },
      { status: 'REFUNDED', count: 9, amount: 4_100_000 },
    ],
    payouts: [{ status: 'PENDING', count: 6, amount: 3_840_000 }],
  }
}

export function mockExpertStats(months: number): ExpertStats {
  return {
    periods: lastMonths(months).map(({ sample, ...m }) => ({ ...m, newExperts: NEW_EXPERTS[sample] })),
    servingExperts: 41,
    suspendedExperts: 2,
  }
}
