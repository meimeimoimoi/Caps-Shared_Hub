import { useQuery } from '@tanstack/react-query'
import { getEscrows } from '../api/disputesApi'
import { disputesKeys } from '../api/queryKeys'

export function useEscrows() {
  return useQuery({
    queryKey: disputesKeys.escrows(),
    queryFn: ({ signal }) => getEscrows(signal),
  })
}
