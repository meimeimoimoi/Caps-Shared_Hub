import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  availabilityKeys,
  getAvailability,
  setAccepting,
  setCapacity,
} from '../api/availabilityApi'
import type { MyAvailability } from '../types'

/** The expert's capacity and request switches; every change refreshes the portal readiness too */
export function useAvailability() {
  const qc = useQueryClient()
  const query = useQuery({
    queryKey: availabilityKeys.all,
    queryFn: ({ signal }) => getAvailability(signal),
  })
  const onSuccess = (data: MyAvailability) => {
    qc.setQueryData(availabilityKeys.all, data)
    void qc.invalidateQueries({
      predicate: (q) => q.queryKey.includes('expert-context'),
    })
  }
  const capacity = useMutation({ mutationFn: setCapacity, onSuccess })
  const toggle = useMutation({
    mutationFn: (input: { serviceCode: string; accepting: boolean }) =>
      setAccepting(input.serviceCode, input.accepting),
    onSuccess,
  })
  return { query, capacity, toggle }
}
