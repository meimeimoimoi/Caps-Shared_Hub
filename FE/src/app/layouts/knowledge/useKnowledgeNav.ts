import { useQuery } from '@tanstack/react-query'
import { getPipelineSummary } from '@/features/knowledgeAdmin-review-approval/api/knowledgeApi'
import { knowledgeKeys } from '@/features/knowledgeAdmin-review-approval/api/queryKeys'

/** Số đếm cho badge sidebar Knowledge Admin; truyền thẳng vào KnowledgeLayout */
export function useKnowledgeNav() {
  const summary = useQuery({
    queryKey: knowledgeKeys.summary(),
    queryFn: ({ signal }) => getPipelineSummary(signal),
  })
  return { queueCount: summary.data?.pending ?? 0 }
}
