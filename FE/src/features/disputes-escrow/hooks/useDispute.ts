import { useQuery, useQueryClient } from '@tanstack/react-query'
import { decideDispute, getDispute, getDisputes } from '../api/disputesApi'
import { disputesKeys } from '../api/queryKeys'
import type { DisputeDecisionInput } from '../types'

export function useDisputes() {
  return useQuery({
    queryKey: disputesKeys.disputes(),
    queryFn: ({ signal }) => getDisputes(signal),
  })
}

export function useDispute(id: string) {
  const qc = useQueryClient()
  const detail = useQuery({
    queryKey: disputesKeys.dispute(id),
    queryFn: ({ signal }) => getDispute(id, signal),
  })

  return {
    dispute: detail.data ?? null,
    isLoading: detail.isLoading,
    decide: async (input: DisputeDecisionInput) => {
      await decideDispute(id, input)
      // Đổi badge, nhật ký, danh sách và Escrow cùng lúc
      await qc.invalidateQueries({ queryKey: disputesKeys.all })
    },
  }
}
