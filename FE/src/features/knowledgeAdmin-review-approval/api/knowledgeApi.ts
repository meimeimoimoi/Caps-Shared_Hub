import { api } from '@/lib/api-client'
import { isExpertDemo } from '@/lib/expert-data-source'
import type { PipelineStage } from '../constants'
import type {
  KnowledgeDocument,
  PipelineSummary,
  UploadMeta,
  VersionComparison,
} from '../types'

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

/* ── Kiểm tra phiên bản ── */
/** null = văn bản không có phiên bản cần so sánh */
export async function getVersionComparison(
  documentId: string,
  signal?: AbortSignal
): Promise<VersionComparison | null> {
  if (isExpertDemo) {
    const c = (await fixtures()).mockComparisons[documentId]
    return c ? structuredClone(c) : null
  }
  return api.get<VersionComparison>(`${BASE}/documents/${documentId}/comparison`, { signal })
}

/** Rời hàng đợi Chờ duyệt: demo bớt số đếm và bỏ/chuyển văn bản trong fixtures */
async function leaveReviewDemo(documentId: string, nextStage: 'parse' | null) {
  const f = await fixtures()
  const i = f.mockDocuments.findIndex((d) => d.id === documentId)
  if (i < 0) return
  f.mockSummary.pending -= 1
  if (nextStage) {
    f.mockDocuments[i].stage = nextStage
    f.mockSummary.parsing += 1
  } else f.mockDocuments.splice(i, 1)
}

/** Chấp nhận phiên bản mới, chuyển sang bước Bóc tách */
export async function continueVersionReview(documentId: string) {
  if (isExpertDemo) return leaveReviewDemo(documentId, 'parse')
  await api.post(`${BASE}/documents/${documentId}/version/continue`)
}

export async function rejectVersion(documentId: string, reason: string) {
  if (isExpertDemo) return leaveReviewDemo(documentId, null)
  await api.post(`${BASE}/documents/${documentId}/version/reject`, { reason })
}

/** onProgress nhận 0–100 theo số byte đã gửi */
export async function uploadDocument(
  file: File,
  meta: UploadMeta,
  onProgress: (percent: number) => void
) {
  if (isExpertDemo) return onProgress(100)
  const body = new FormData()
  body.append('file', file)
  Object.entries(meta).forEach(([k, v]) => body.append(k, v))
  // apiClient mặc định gửi JSON; FormData cần header multipart
  await api.post(`${BASE}/documents`, body, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (e) =>
      e.total && onProgress(Math.round((e.loaded / e.total) * 100)),
  })
}
