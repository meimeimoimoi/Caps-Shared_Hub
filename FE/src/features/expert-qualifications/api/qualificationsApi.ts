import { api } from '@/lib/api-client'
import type { Qualification, QualificationOverview } from '../types'

interface Envelope<T> {
  success: boolean
  data: T
  message?: string
}

const BASE = '/api/v1/experts/me/qualifications'

export const qualificationKeys = {
  all: ['private', 'expert', 'qualifications'] as const,
  overview: () => [...qualificationKeys.all, 'overview'] as const,
  detail: (id: string) => [...qualificationKeys.all, 'detail', id] as const,
}

/** Active services with the latest qualification of each and whether it can be registered now */
export async function getQualifications(signal?: AbortSignal) {
  const res = await api.get<Envelope<QualificationOverview>>(BASE, { signal })
  return res.data
}

export async function getQualification(id: string, signal?: AbortSignal) {
  const res = await api.get<Envelope<Qualification>>(`${BASE}/${id}`, {
    signal,
  })
  return res.data
}

/** Registers for a service; the qualification starts in competency review */
export async function registerForService(serviceCode: string) {
  const res = await api.post<Envelope<Qualification>>(BASE, { serviceCode })
  return res.data
}

export async function addQualificationFile(id: string, file: File) {
  const form = new FormData()
  form.append('file', file)
  const res = await api.post<Envelope<Qualification>>(
    `${BASE}/${id}/evidence`,
    form,
    { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 60_000 }
  )
  return res.data
}

export async function removeQualificationFile(id: string, evidenceId: string) {
  const res = await api.del<Envelope<Qualification>>(
    `${BASE}/${id}/evidence/${evidenceId}`
  )
  return res.data
}

/** Sends the qualification back to competency review after more evidence was requested */
export async function supplementQualification(id: string, note: string) {
  const res = await api.post<Envelope<Qualification>>(
    `${BASE}/${id}/supplement`,
    { note: note.trim() || null }
  )
  return res.data
}

/** The expert's own files are served by the application endpoint, whichever gate they belong to */
export function openOwnFile(evidenceId: string) {
  return api.get<Blob>(
    `/api/v1/experts/me/application/evidence/${evidenceId}/file`,
    { responseType: 'blob', timeout: 60_000 }
  )
}
