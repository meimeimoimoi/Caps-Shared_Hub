import { api } from '@/lib/api-client'
import type { MyService, PricingInput } from './model'

interface Envelope<T> {
  success: boolean
  data: T
  message?: string
}

const BASE = '/api/v1/experts/me/services'

/** Every service open for pricing with its platform fee and the expert's price, if any */
export async function getMyServices(signal?: AbortSignal) {
  const res = await api.get<Envelope<MyService[]>>(BASE, { signal })
  return res.data
}

/** Sets the price and delivery time; applies at once, no approval */
export async function saveMyService(serviceCode: string, input: PricingInput) {
  const res = await api.put<Envelope<MyService>>(
    `${BASE}/${encodeURIComponent(serviceCode)}`,
    {
      fee: Number(input.fee),
      turnaroundHours: Number(input.turnaroundHours),
    }
  )
  return res.data
}
