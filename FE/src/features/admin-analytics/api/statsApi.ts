import { api } from '@/lib/api-client'
import { isExpertDemo } from '@/lib/expert-data-source'
import type { BillingStats, ExpertStats, UserStats } from '../types'

interface Envelope<T> {
  success: boolean
  data: T
}

const fixtures = () => import('./fixtures')

/* Each service counts its own data over the same calendar months (Vietnam time), oldest first; the
 * current month comes back with partial: true so it is never compared with a full month. */

export const statsKeys = {
  all: ['private', 'admin', 'stats'] as const,
  users: (months: number) => [...statsKeys.all, 'users', months] as const,
  billing: (months: number) => [...statsKeys.all, 'billing', months] as const,
  experts: (months: number) => [...statsKeys.all, 'experts', months] as const,
}

/** Verified accounts per month (UserManage) */
export async function getUserStats(months: number, signal?: AbortSignal) {
  if (isExpertDemo) return (await fixtures()).mockUserStats(months)
  const res = await api.get<Envelope<UserStats>>('/api/v1/admin/users/stats', {
    params: { months },
    signal,
  })
  return res.data
}

/** Money settled per month and current escrow/payout totals (PayoutManage) */
export async function getBillingStats(months: number, signal?: AbortSignal) {
  if (isExpertDemo) return (await fixtures()).mockBillingStats(months)
  const res = await api.get<Envelope<BillingStats>>('/api/v1/admin/billing/stats', {
    params: { months },
    signal,
  })
  return res.data
}

/** New experts per month and experts serving or suspended now (ExpertApprove) */
export async function getExpertStats(months: number, signal?: AbortSignal) {
  if (isExpertDemo) return (await fixtures()).mockExpertStats(months)
  const res = await api.get<Envelope<ExpertStats>>('/api/v1/admin/experts/stats', {
    params: { months },
    signal,
  })
  return res.data
}
