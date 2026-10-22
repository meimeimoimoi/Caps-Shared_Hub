import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/features/auth'
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
  const queryKey = ['private', scope, 'expert-pricing', serviceId]
  const query = useQuery({
    queryKey,
    queryFn: ({ signal }) => getPricing(serviceId, signal),
    enabled: qualified,
    staleTime: 0,
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
      return savePricing(serviceId, input, revision, submit)
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
