import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  addSlot,
  availabilityKeys,
  getAvailability,
  removeSlot,
  setAccepting,
} from '../api/availabilityApi'
import type { MyAvailability } from '../types'

/** The expert's slots and request switches; every change refreshes the portal readiness too */
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
  const add = useMutation({
    mutationFn: (input: { startAt: string; endAt: string }) =>
      addSlot(input.startAt, input.endAt),
    onSuccess,
  })
  const remove = useMutation({ mutationFn: removeSlot, onSuccess })
  const toggle = useMutation({
    mutationFn: (input: { serviceCode: string; accepting: boolean }) =>
      setAccepting(input.serviceCode, input.accepting),
    onSuccess,
  })
  return { query, add, remove, toggle }
}
