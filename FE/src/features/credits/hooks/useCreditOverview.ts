import { useQuery } from '@tanstack/react-query'
import { creditsKeys, getCreditOverview } from '../api/creditsApi'

export function useCreditOverview() {
  return useQuery({
    queryKey: creditsKeys.overview(),
    queryFn: ({ signal }) => getCreditOverview(signal),
  })
}
