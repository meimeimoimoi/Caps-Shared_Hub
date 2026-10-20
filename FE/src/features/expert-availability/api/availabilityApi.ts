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

/** Opens a slot; times are ISO strings with an offset */
export async function addSlot(startAt: string, endAt: string) {
  return (
    await api.post<Envelope<MyAvailability>>(`${BASE}/slots`, { startAt, endAt })
  ).data
}

export async function removeSlot(id: string) {
  return (await api.del<Envelope<MyAvailability>>(`${BASE}/slots/${id}`)).data
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
