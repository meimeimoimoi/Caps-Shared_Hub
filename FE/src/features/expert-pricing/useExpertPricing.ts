import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/features/auth'
import { isExpertDemo } from '@/lib/expert-data-source'
import { getDemoPricing, updateDemoPricing } from './demoRepository'
import type { PricingInput } from './model'
export function useExpertPricing(
  expertId: string,
  serviceId: string,
  qualified: boolean
) {
  const sessionScope = useAuthStore((s) => s.sessionScope)
  const scope = expertId + ':' + sessionScope
  const client = useQueryClient()
  const queryKey = ['private', scope, 'expert-pricing', 'demo', serviceId]
  const query = useQuery({
    queryKey,
    queryFn: () => getDemoPricing(scope, serviceId),
    enabled: isExpertDemo && qualified,
    staleTime: Infinity,
  })
  const mutation = useMutation({
    mutationFn: async ({
      input,
      revision,
      submit,
    }: {
      input: PricingInput
      revision: number
      submit: boolean
    }) => {
      if (!isExpertDemo) throw new Error('PRICING_API_UNAVAILABLE')
      return updateDemoPricing(scope, serviceId, input, {
        qualified,
        expectedRevision: revision,
        submit,
        actor: expertId,
      })
    },
    onSuccess: (data) => {
      client.setQueryData(queryKey, data)
      void client.invalidateQueries({
        predicate: (query) => query.queryKey.includes('expert-context'),
      })
    },
  })
  return { query, mutation }
}
