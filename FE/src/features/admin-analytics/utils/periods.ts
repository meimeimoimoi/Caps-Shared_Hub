import type { BillingStats, StatPeriod, UserStats } from '../types'

/** Joins the monthly figures of auth and billing; both services return the same months. */
export function toMonths(users: UserStats, billing: BillingStats): StatPeriod[] {
  const money = new Map(billing.periods.map((p) => [p.start, p]))
  return users.periods.map((u) => {
    const m = money.get(u.start)
    return {
      start: u.start,
      partial: u.partial,
      expertPayout: m?.expertPayout ?? 0,
      platformFee: m?.platformFee ?? 0,
      refunds: m?.refunds ?? 0,
      newUsers: u.newUsers,
      totalUsers: u.totalUsers,
    }
  })
}

/** Groups months into quarters: period figures are added, total users is taken at the quarter's end.
 * A first quarter missing months (not enough data) is dropped; a last quarter under 3 months is still running. */
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
    cur.newUsers += m.newUsers
    cur.totalUsers = m.totalUsers
    cur.partial = cur.partial || m.partial
    cur.months += 1
  }
  const quarters = [...byKey.values()]
  const first = quarters[0]
  if (first && first.months < 3) quarters.shift()
  return quarters.map(({ months: n, ...p }) => ({ ...p, partial: p.partial || n < 3 }))
}
