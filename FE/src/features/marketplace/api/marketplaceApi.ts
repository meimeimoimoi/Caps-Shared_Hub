import { api, gatewayUrl } from '@/lib/api-client'
import { isExpertDemo } from '@/lib/expert-data-source'
import { demoBio } from '@/features/expert-bio/api/demoRepository'
import type { ExpertBio } from '@/features/expert-bio/types'
import { bioFromDto, marketplaceFromDtos } from '../model'
import type { MarketplaceData, MarketplaceExpertDto } from '../types'

interface Envelope<T> {
  success: boolean
  data: T
  message?: string
}

// Public (anonymous) listing served by the expert service through the gateway
const BASE = '/api/v1/marketplace/experts'

/** The avatar comes as a gateway path; img tags need a URL they can load from the app's origin. */
export const withAvatarUrl = (dto: MarketplaceExpertDto): MarketplaceExpertDto => ({
  ...dto,
  avatarUrl: gatewayUrl(dto.avatarUrl) ?? null,
})

/** Every listed expert across all services; the page filters by service locally. */
export async function getMarketplace(
  signal?: AbortSignal
): Promise<MarketplaceData> {
  if (isExpertDemo) return (await import('../fixtures')).demoMarketplace()
  const res = await api.get<Envelope<MarketplaceExpertDto[]>>(BASE, { signal })
  return marketplaceFromDtos(res.data.map(withAvatarUrl))
}

/** One listed expert's public profile; 404 when unknown or no longer listed. */
export async function getPublicExpert(
  expertId: string,
  signal?: AbortSignal
): Promise<ExpertBio> {
  if (isExpertDemo) return demoBio(expertId)
  const res = await api.get<Envelope<MarketplaceExpertDto>>(
    `${BASE}/${encodeURIComponent(expertId)}`,
    { signal }
  )
  return bioFromDto(withAvatarUrl(res.data))
}
