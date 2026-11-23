import { useQuery } from '@tanstack/react-query'
import { getKnowledgeStats } from '../api/statsApi'

export function useKnowledgeStats() {
  return useQuery({
    queryKey: ['private', 'knowledge-admin', 'stats'],
    queryFn: ({ signal }) => getKnowledgeStats(signal),
  })
}
