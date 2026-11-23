import { api } from '@/lib/api-client'
import { isExpertDemo } from '@/lib/expert-data-source'
import type { ExpertBio, ExpertBioInput } from '../types'
import { demoBio, saveDemoBio } from './demoRepository'

export function getExpertBio(expertId: string): Promise<ExpertBio> {
  return isExpertDemo
    ? demoBio(expertId)
    : api.get<ExpertBio>(`/api/experts/${encodeURIComponent(expertId)}/bio`)
}

export function saveExpertBio(
  expertId: string,
  input: ExpertBioInput
): Promise<ExpertBio> {
  return isExpertDemo
    ? saveDemoBio(expertId, input)
    : api.put<ExpertBio>('/api/expert/me/bio', input)
}
