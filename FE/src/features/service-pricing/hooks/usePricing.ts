import { useQuery } from '@tanstack/react-query'
import { getPricing } from '../api/pricingApi'

export function usePricing() {
  return useQuery({
    queryKey: ['private', 'admin', 'pricing'],
    queryFn: ({ signal }) => getPricing(signal),
  })
}
