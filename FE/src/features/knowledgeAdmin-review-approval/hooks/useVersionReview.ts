import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  continueVersionReview,
  getVersionComparison,
  rejectVersion,
} from '../api/knowledgeApi'
import { knowledgeKeys } from '../api/queryKeys'

export function useVersionReview(documentId: string) {
  const qc = useQueryClient()
  const query = useQuery({
    queryKey: knowledgeKeys.comparison(documentId),
    queryFn: ({ signal }) => getVersionComparison(documentId, signal),
  })
  // Văn bản rời hàng đợi → số đếm và bảng phải đổi theo
  const refresh = () => qc.invalidateQueries({ queryKey: knowledgeKeys.all })

  return {
    comparison: query.data ?? null,
    isLoading: query.isLoading,
    error: query.error,
    continueReview: () => continueVersionReview(documentId).then(refresh),
    reject: (reason: string) => rejectVersion(documentId, reason).then(refresh),
  }
}
