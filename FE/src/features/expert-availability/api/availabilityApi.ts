import { api } from '@/lib/api-client'
import type { MyAvailability } from '../types'
import type { ExpertViolations } from '@/features/expert-vetting/types'

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

const VIOLATIONS = '/api/v1/experts/me/violations'

export const violationKeys = {
  all: ['private', 'expert', 'violations'] as const,
}

/** The expert's own violation points (late +1, withdrew +2, never delivered +3, counted 90 days) */
export async function getMyViolations(signal?: AbortSignal) {
  return (await api.get<Envelope<ExpertViolations>>(VIOLATIONS, { signal })).data
}

/** Asks the admin to excuse one violation for force majeure (once, within 2 days of it), with evidence files */
export async function requestExcuse(reviewCaseId: string, reason: string, files: File[]) {
  const form = new FormData()
  form.append('reason', reason)
  for (const file of files) form.append('files', file)
  return (
    await api.post<Envelope<ExpertViolations>>(`${VIOLATIONS}/${reviewCaseId}/excuse-request`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 120_000,
    })
  ).data
}
