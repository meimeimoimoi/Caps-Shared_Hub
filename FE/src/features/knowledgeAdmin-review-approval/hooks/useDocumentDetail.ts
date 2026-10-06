import { useQuery } from '@tanstack/react-query'
import { getDocumentDetail } from '../api/knowledgeApi'
import { knowledgeKeys } from '../api/queryKeys'

export function useDocumentDetail(documentId: string) {
  return useQuery({
    queryKey: knowledgeKeys.detail(documentId),
    queryFn: ({ signal }) => getDocumentDetail(documentId, signal),
  })
}
