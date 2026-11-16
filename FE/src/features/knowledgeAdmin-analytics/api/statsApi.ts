import { api } from '@/lib/api-client'
import { isKnowledgeDemo } from '@/lib/knowledge-data-source'
import type { KnowledgeStats } from '../types'

interface Envelope<T> {
  success: boolean
  data: T
}

/* Knowledge base statistics; months follow Vietnam time and the current month comes back partial. */
export async function getKnowledgeStats(signal?: AbortSignal): Promise<KnowledgeStats> {
  if (isKnowledgeDemo) return (await import('./fixtures')).mockKnowledgeStats()
  const res = await api.get<Envelope<KnowledgeStats>>('/api/v1/knowledge/stats', {
    params: { months: 12 },
    signal,
  })
  return res.data
}
