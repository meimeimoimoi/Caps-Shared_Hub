import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getUploads, uploadDocument } from '../api/knowledgeApi'
import { knowledgeKeys } from '../api/queryKeys'

export function useUploads() {
  const qc = useQueryClient()
  const query = useQuery({
    queryKey: knowledgeKeys.uploads(),
    queryFn: ({ signal }) => getUploads(signal),
  })
  return {
    uploads: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    upload: async (...args: Parameters<typeof uploadDocument>) => {
      await uploadDocument(...args)
      // Kết quả mới + số đếm hàng đợi đổi theo
      await qc.invalidateQueries({ queryKey: knowledgeKeys.all })
    },
  }
}
