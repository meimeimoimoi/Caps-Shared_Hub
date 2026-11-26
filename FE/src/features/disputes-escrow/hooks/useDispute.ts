import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  decideDispute,
  escalateDispute,
  getDispute,
  getDisputes,
} from '../api/disputesApi'
import { disputesKeys } from '../api/queryKeys'
import type { DisputeDecisionInput } from '../types'

export function useDisputes(enabled = true) {
  return useQuery({
    queryKey: disputesKeys.disputes(),
    queryFn: ({ signal }) => getDisputes(signal),
    enabled,
    // No realtime push reaches the admin queue, so a newly opened dispute shows within a minute
    // or when the admin comes back to the tab
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  })
}

export function useDispute(id: string, enabled = true) {
  const qc = useQueryClient()
  const detail = useQuery({
    queryKey: disputesKeys.dispute(id),
    queryFn: ({ signal }) => getDispute(id, signal),
    enabled,
  })

  return {
    dispute: detail.data ?? null,
    isLoading: detail.isLoading,
    error: detail.error,
    decide: async (input: DisputeDecisionInput) => {
      await decideDispute(id, input)
      // Đổi badge, nhật ký, danh sách và Escrow cùng lúc
      await qc.invalidateQueries({ queryKey: disputesKeys.all })
    },
    escalate: async (reason: string) => {
      await escalateDispute(id, reason)
      await qc.invalidateQueries({ queryKey: disputesKeys.all })
    },
  }
}
