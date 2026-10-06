import { api } from '@/lib/api-client'
import { isExpertDemo } from '@/lib/expert-data-source'
import type { QueueFilter } from '../constants'
import type {
  ApproveInput,
  DocumentDetail,
  DocumentReview,
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

/** stage = 'collect' → mọi văn bản thu thập trong tháng; 'failed' → văn bản đang lỗi */
export async function getDocuments(stage: QueueFilter, signal?: AbortSignal) {
  if (isExpertDemo) {
    const docs = structuredClone((await fixtures()).mockDocuments)
    if (stage === 'collect') return docs
    if (stage === 'failed') return docs.filter((d) => d.failure)
    return docs.filter((d) => d.stage === stage)
  }
  return api.get<KnowledgeDocument[]>(`${BASE}/documents`, {
    params: { stage },
    signal,
  })
}

/** Thử lại ngay bước bị lỗi (index hoặc bóc tách) */
export async function retryDocument(documentId: string) {
  if (isExpertDemo) {
    const f = await fixtures()
    const d = f.mockDocuments.find((x) => x.id === documentId)
    if (!d?.failure) return
    const index = d.failure.kind === 'INDEX_FAILED'
    f.mockSummary[index ? 'indexFailed' : 'parseFailed'] -= 1
    f.mockSummary[index ? 'indexing' : 'parsing'] += 1
    delete d.failure
    return
  }
  await api.post(`${BASE}/documents/${documentId}/retry`)
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
async function leaveReviewDemo(
  documentId: string,
  nextStage: 'parse' | 'index' | null
) {
  const f = await fixtures()
  const i = f.mockDocuments.findIndex((d) => d.id === documentId)
  if (i < 0) return
  f.mockSummary.pending -= 1
  if (nextStage) {
    f.mockDocuments[i].stage = nextStage
    f.mockSummary[nextStage === 'parse' ? 'parsing' : 'indexing'] += 1
  } else f.mockDocuments.splice(i, 1)
}

/* ── Chi tiết văn bản ── */
/** null = không tìm thấy (demo); API trả 404 thành ApiError */
export async function getDocumentDetail(
  documentId: string,
  signal?: AbortSignal
): Promise<DocumentDetail | null> {
  if (isExpertDemo) return (await fixtures()).getMockDetail(documentId)
  return api.get<DocumentDetail>(`${BASE}/documents/${documentId}`, { signal })
}

/* ── Rà soát nội dung bóc tách ── */
/** null = văn bản chưa có nội dung bóc tách */
export async function getDocumentReview(
  documentId: string,
  signal?: AbortSignal
): Promise<DocumentReview | null> {
  if (isExpertDemo) {
    const r = (await fixtures()).mockReviews[documentId]
    return r ? structuredClone(r) : null
  }
  return api.get<DocumentReview>(`${BASE}/documents/${documentId}/review`, { signal })
}

async function findUnitDemo(documentId: string, unitId: string) {
  const r = (await fixtures()).mockReviews[documentId]
  return r?.chapters
    .flatMap((c) => c.articles)
    .flatMap((a) => a.units)
    .find((u) => u.id === unitId)
}

export async function markUnitReviewed(documentId: string, unitId: string) {
  if (isExpertDemo) {
    const u = await findUnitDemo(documentId, unitId)
    if (u) u.status = 'REVIEWED'
    return
  }
  await api.post(`${BASE}/documents/${documentId}/units/${unitId}/reviewed`)
}

/** Sửa nội dung một đơn vị; sửa xong coi như đã rà soát */
export async function saveUnitText(documentId: string, unitId: string, text: string) {
  if (isExpertDemo) {
    const u = await findUnitDemo(documentId, unitId)
    if (u) Object.assign(u, { text, status: 'REVIEWED' })
    return
  }
  await api.put(`${BASE}/documents/${documentId}/units/${unitId}`, { text })
}

/** Duyệt nội dung → chuyển sang bước Index */
export async function approveDocument(documentId: string, body: ApproveInput) {
  if (isExpertDemo) return leaveReviewDemo(documentId, 'index')
  await api.post(`${BASE}/documents/${documentId}/approve`, body)
}

export async function rejectDocument(documentId: string, reason: string) {
  if (isExpertDemo) return leaveReviewDemo(documentId, null)
  await api.post(`${BASE}/documents/${documentId}/reject`, { reason })
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
