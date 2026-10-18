import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/features/auth'
import { isExpertDemo } from '@/lib/expert-data-source'
import { getDemoPricing, updateDemoPricing } from './demoRepository'
import { getPricing, savePricing } from './pricingApi'
import type { PricingInput } from './model'
export function useExpertPricing(
  expertId: string,
  serviceId: string,
  qualified: boolean
) {
  const sessionScope = useAuthStore((s) => s.sessionScope)
  const scope = expertId + ':' + sessionScope
  const client = useQueryClient()
  const source = isExpertDemo ? 'demo' : 'api'
  const queryKey = ['private', scope, 'expert-pricing', source, serviceId]
  const query = useQuery({
    queryKey,
    queryFn: ({ signal }) =>
      isExpertDemo
        ? getDemoPricing(scope, serviceId)
        : getPricing(serviceId, signal),
    enabled: qualified,
    staleTime: isExpertDemo ? Infinity : 0,
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
      if (!isExpertDemo) return savePricing(serviceId, input, revision, submit)
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
