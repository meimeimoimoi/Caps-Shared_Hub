import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/features/auth'
import { isExpertDemo } from '@/lib/expert-data-source'
import { getDemoServices, updateDemoService } from './demoRepository'
import { getMyServices, saveMyService } from './pricingApi'
import type { PricingInput } from './model'

/** The expert's price for one service; data is null when the service is not open for pricing */
export function useExpertPricing(
  expertId: string,
  serviceId: string,
  qualified: boolean
) {
  const sessionScope = useAuthStore((s) => s.sessionScope)
  const scope = expertId + ':' + sessionScope
  const client = useQueryClient()
  const source = isExpertDemo ? 'demo' : 'api'
  const queryKey = ['private', scope, 'expert-services', source]
  const query = useQuery({
    queryKey,
    queryFn: ({ signal }) =>
      isExpertDemo ? getDemoServices(scope) : getMyServices(signal),
    enabled: qualified,
    staleTime: isExpertDemo ? Infinity : 0,
    select: (list) => list.find((s) => s.serviceCode === serviceId) ?? null,
  })
  const mutation = useMutation({
    mutationFn: async (input: PricingInput) =>
      isExpertDemo
        ? updateDemoService(scope, serviceId, input)
        : saveMyService(serviceId, input),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey })
      // Readiness (marketplace listing) depends on having a price
      void client.invalidateQueries({
        predicate: (query) => query.queryKey.includes('expert-context'),
      })
    },
  })
  return { query, mutation }
}
