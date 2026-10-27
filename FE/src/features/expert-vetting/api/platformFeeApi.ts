import { api } from '@/lib/api-client'
import { isExpertDemo } from '@/lib/expert-data-source'

interface Envelope<T> {
  success: boolean
  data: T
  message?: string
}

/**
 * One catalog service with the platform fee in force (percent is null until the first fee is set), the change
 * announced ahead if any, and the first day a new change may take effect (YYYY-MM-DD, Vietnam time).
 */
export interface PlatformFee {
  serviceCode: string
  serviceName: string
  percent: number | null
  effectiveFrom: string | null
  pending: { percent: number; effectiveFrom: string } | null
  earliestEffectiveOn: string
  noticeDays: number
  maxPercent: number
}

const BASE = '/api/v1/experts/admin/platform-fees'

/** Every active catalog service with its fee; empty in demo mode */
export async function getPlatformFees(signal?: AbortSignal) {
  if (isExpertDemo) return []
  const res = await api.get<Envelope<PlatformFee[]>>(BASE, { signal })
  return res.data
}

/**
 * Announces a new fee from effectiveOn (at least the notice days away; leave it out only for the first fee).
 * It replaces a change still pending; cases already booked keep the old percent.
 */
export async function setPlatformFee(
  serviceCode: string,
  percent: number,
  effectiveOn: string | null
) {
  const res = await api.put<Envelope<PlatformFee>>(
    `${BASE}/${encodeURIComponent(serviceCode)}`,
    { percent, effectiveOn }
  )
  return res.data
}

/** Withdraws the pending change; the fee in force stays */
export async function cancelPendingPlatformFee(serviceCode: string) {
  const res = await api.del<Envelope<PlatformFee>>(
    `${BASE}/${encodeURIComponent(serviceCode)}/pending`
  )
  return res.data
}
