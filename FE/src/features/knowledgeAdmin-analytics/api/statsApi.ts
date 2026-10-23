import { api } from '@/lib/api-client'
import { isKnowledgeDemo } from '@/lib/knowledge-data-source'
import type { KnowledgeStats } from '../types'

/* Thống kê kho tri thức theo tháng.
 * TODO(api): đối chiếu endpoint với BE khi có Swagger; BE gắn partial: true cho tháng đang chạy. */
export async function getKnowledgeStats(signal?: AbortSignal): Promise<KnowledgeStats> {
  if (isKnowledgeDemo) return (await import('./fixtures')).mockKnowledgeStats()
  return api.get<KnowledgeStats>('/api/knowledge/stats', { signal })
}
