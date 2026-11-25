import { api } from '@/lib/api-client'
import { isExpertDemo } from '@/lib/expert-data-source'
import { bioFromDto } from '@/features/marketplace/model'
import { withAvatarUrl } from '@/features/marketplace/api/marketplaceApi'
import type { MarketplaceExpertDto } from '@/features/marketplace/types'
import type { ExpertBio, ExpertBioInput } from '../types'
import { demoBio, saveDemoBio } from './demoRepository'

const BASE = '/api/v1/experts/me/bio'

// The editor works on the title alone; the public page adds the company after it
const myBio = (dto: MarketplaceExpertDto): ExpertBio => ({
  ...bioFromDto(withAvatarUrl(dto)),
  headline: dto.title ?? '',
})

/** The signed-in expert's public profile, also while not listed (then without services or rating). */
export async function getExpertBio(expertId: string): Promise<ExpertBio> {
  if (isExpertDemo) return demoBio(expertId)
  const res = await api.get<{ data: MarketplaceExpertDto }>(BASE)
  return myBio(res.data)
}

/** Saves the public profile; years of experience stay as reviewed at Gate 1. */
export async function saveExpertBio(
  expertId: string,
  input: ExpertBioInput
): Promise<ExpertBio> {
  if (isExpertDemo) return saveDemoBio(expertId, input)
  const res = await api.put<{ data: MarketplaceExpertDto }>(BASE, {
    title: input.headline,
    location: input.location,
    bio: input.bio,
    fields: input.expertise,
    highlights: input.highlights.join('\n'),
  })
  return myBio(res.data)
}
