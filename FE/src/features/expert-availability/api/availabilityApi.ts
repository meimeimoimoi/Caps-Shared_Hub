import { api } from '@/lib/api-client'
import type { MyAvailability } from '../types'

interface Envelope<T> {
  success: boolean
  data: T
  message?: string
}

const BASE = '/api/v1/experts/me/availability'

export const availabilityKeys = {
  all: ['private', 'expert', 'availability'] as const,
}

export async function getAvailability(signal?: AbortSignal) {
  return (await api.get<Envelope<MyAvailability>>(BASE, { signal })).data
}

/** Sets how many cases the expert runs at once (1–20) */
export async function setCapacity(capacity: number) {
  return (await api.put<Envelope<MyAvailability>>(BASE, { capacity })).data
}

/** Turns new requests on or off for one service */
export async function setAccepting(serviceCode: string, accepting: boolean) {
  return (
    await api.put<Envelope<MyAvailability>>(
      `${BASE}/services/${encodeURIComponent(serviceCode)}`,
      { accepting }
    )
  ).data
}
