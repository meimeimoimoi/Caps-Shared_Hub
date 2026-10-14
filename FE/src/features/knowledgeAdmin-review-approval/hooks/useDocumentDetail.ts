import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getDocumentDetail, retireDocument } from '../api/knowledgeApi'
import { knowledgeKeys } from '../api/queryKeys'

export function useDocumentDetail(documentId: string) {
  const qc = useQueryClient()
  const query = useQuery({
    queryKey: knowledgeKeys.detail(documentId),
    queryFn: ({ signal }) => getDocumentDetail(documentId, signal),
  })
  return {
    ...query,
    retire: (reason: string) =>
      retireDocument(documentId, reason).then(() =>
        qc.invalidateQueries({ queryKey: knowledgeKeys.detail(documentId) })
      ),
  }
}
