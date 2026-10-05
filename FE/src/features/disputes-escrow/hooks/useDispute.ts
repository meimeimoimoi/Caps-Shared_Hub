import { useQuery, useQueryClient } from '@tanstack/react-query'
import { decideDispute, getDispute, getDisputes } from '../api/disputesApi'
import { disputesKeys } from '../api/queryKeys'
import type { DisputeDecisionInput } from '../types'

/** Không có id (mở từ sidebar) → lấy khiếu nại đang mở đầu tiên */
export function useDispute(paramId?: string) {
  const qc = useQueryClient()
  const list = useQuery({
    queryKey: disputesKeys.disputes(),
    queryFn: ({ signal }) => getDisputes(signal),
    enabled: !paramId,
  })
  const id =
    paramId ??
    list.data?.find((d) => !d.resolvedAt)?.id ??
    list.data?.[0]?.id
  const detail = useQuery({
    queryKey: disputesKeys.dispute(id ?? ''),
    queryFn: ({ signal }) => getDispute(id!, signal),
    enabled: !!id,
  })

  return {
    id,
    dispute: detail.data ?? null,
    isLoading: list.isLoading || detail.isLoading,
    decide: async (input: DisputeDecisionInput) => {
      await decideDispute(id!, input)
      // Đổi badge, nhật ký và Escrow cùng lúc
      await qc.invalidateQueries({ queryKey: disputesKeys.all })
    },
  }
}
