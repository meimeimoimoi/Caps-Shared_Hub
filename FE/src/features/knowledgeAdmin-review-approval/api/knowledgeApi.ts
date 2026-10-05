import { api } from '@/lib/api-client'
import { isExpertDemo } from '@/lib/expert-data-source'
import type { PipelineStage } from '../constants'
import type { KnowledgeDocument, PipelineSummary } from '../types'

/* Dev chạy demo thì đọc fixtures.
 * TODO(api): đối chiếu lại đường dẫn endpoint với BE khi có Swagger. */
const fixtures = () => import('./fixtures')
const BASE = '/api/knowledge'

export async function getPipelineSummary(signal?: AbortSignal) {
  if (isExpertDemo) return structuredClone((await fixtures()).mockSummary)
  return api.get<PipelineSummary>(`${BASE}/pipeline/summary`, { signal })
}

/** stage = 'collect' → mọi văn bản thu thập trong tháng */
export async function getDocuments(stage: PipelineStage, signal?: AbortSignal) {
  if (isExpertDemo) {
    const docs = structuredClone((await fixtures()).mockDocuments)
    return stage === 'collect' ? docs : docs.filter((d) => d.stage === stage)
  }
  return api.get<KnowledgeDocument[]>(`${BASE}/documents`, {
    params: { stage },
    signal,
  })
}

export async function uploadDocuments(files: File[]) {
  if (isExpertDemo) return
  const body = new FormData()
  files.forEach((f) => body.append('files', f))
  // apiClient mặc định gửi JSON; FormData cần header multipart
  await api.post(`${BASE}/documents`, body, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
}
