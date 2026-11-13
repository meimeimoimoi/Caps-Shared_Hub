import { api } from '@/lib/api-client'
import { isExpertDemo } from '@/lib/expert-data-source'

interface Envelope<T> {
  success: boolean
  data: T
  message?: string
}

/**
 * What a late delivery costs: up to penaltyHours late the client gets penaltyPercent back from the expert's
 * share; later, up to cancelHours, the whole fee; past cancelHours the case is cancelled.
 */
export interface LateRule {
  penaltyHours: number
  penaltyPercent: number
  cancelHours: number
}

/** Client silence: after `hours` the case ends; refundPercent to the client, expertPercent to the expert, the platform keeps the rest. */
export interface NoResponseRule {
  hours: number
  refundPercent: number
  expertPercent: number
}

/**
 * One catalog service with the platform fee in force (percent is null until the first fee is set), the change
 * announced ahead if any, and the first day a new change may take effect (YYYY-MM-DD, Vietnam time).
 */
export interface PlatformFee {
  serviceCode: string
  serviceName: string
  percent: number | null
  late: LateRule | null
  noResponse: NoResponseRule | null
  effectiveFrom: string | null
  pending: {
    percent: number
    late: LateRule
    noResponse: NoResponseRule
    effectiveFrom: string
  } | null
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
  late: LateRule,
  noResponse: NoResponseRule,
  effectiveOn: string | null
) {
  const res = await api.put<Envelope<PlatformFee>>(
    `${BASE}/${encodeURIComponent(serviceCode)}`,
    {
      percent,
      latePenaltyHours: late.penaltyHours,
      latePenaltyPercent: late.penaltyPercent,
      lateCancelHours: late.cancelHours,
      noResponseHours: noResponse.hours,
      noResponseRefundPercent: noResponse.refundPercent,
      noResponseExpertPercent: noResponse.expertPercent,
      effectiveOn,
    }
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
