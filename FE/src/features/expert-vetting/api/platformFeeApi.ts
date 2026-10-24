import { api } from '@/lib/api-client'
import { isExpertDemo } from '@/lib/expert-data-source'

interface Envelope<T> {
  success: boolean
  data: T
  message?: string
}

/** One catalog service and its current platform fee; percent is null until the first fee is set */
export interface PlatformFee {
  serviceCode: string
  serviceName: string
  percent: number | null
  effectiveFrom: string | null
}

const BASE = '/api/v1/experts/admin/platform-fees'

/** Every active catalog service with its fee; empty in demo mode */
export async function getPlatformFees(signal?: AbortSignal) {
  if (isExpertDemo) return []
  const res = await api.get<Envelope<PlatformFee[]>>(BASE, { signal })
  return res.data
}

/** A new fee effective now; cases already booked keep the old percent */
export async function setPlatformFee(serviceCode: string, percent: number) {
  const res = await api.put<Envelope<PlatformFee>>(
    `${BASE}/${encodeURIComponent(serviceCode)}`,
    { percent }
  )
  return res.data
}
