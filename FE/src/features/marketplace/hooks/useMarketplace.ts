import { useQuery } from '@tanstack/react-query'
import { expertDataSource } from '@/lib/expert-data-source'
import { getMarketplace, getPublicExpert } from '../api/marketplaceApi'

export const marketplaceKeys = {
  all: ['public', 'marketplace', expertDataSource] as const,
  list: () => [...marketplaceKeys.all, 'list'] as const,
  expert: (id: string) => [...marketplaceKeys.all, 'expert', id] as const,
}

export function useMarketplace() {
  return useQuery({
    queryKey: marketplaceKeys.list(),
    queryFn: ({ signal }) => getMarketplace(signal),
    staleTime: 60_000,
  })
}

export function usePublicExpert(expertId: string | undefined) {
  return useQuery({
    queryKey: marketplaceKeys.expert(expertId ?? ''),
    queryFn: ({ signal }) => getPublicExpert(expertId!, signal),
    enabled: Boolean(expertId),
    retry: false,
  })
}
