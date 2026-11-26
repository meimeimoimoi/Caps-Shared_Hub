import { api, ApiError } from '@/lib/api-client'
import { isKnowledgeDemo } from '@/lib/knowledge-data-source'
import {
  rejectedResult,
  uploadedResult,
  type UploadedDocumentDto,
} from './uploadMappers'
import {
  toDocumentDetail,
  toDocumentReview,
  toKnowledgeDocument,
  toPipelineSummary,
  type DocumentPreviewDto,
  type DocumentSummaryDto,
  type KnowledgePipelineDto,
} from './mappers'
import type { QueueFilter } from '../constants'
import type {
  ApproveInput,
  DocumentDetail,
  DocumentReview,
  KnowledgeDocument,
  PipelineSummary,
  UploadMeta,
  UploadResult,
  VersionComparison,
} from '../types'

/* Dev chạy demo thì đọc fixtures; API mode reads ingestion through the gateway. */
const fixtures = () => import('./fixtures')
const DOCUMENTS = '/api/v1/knowledge/documents'

interface Envelope<T> {
  success: boolean
  data: T
  message?: string
}

interface Page<T> {
  items: T[]
  page: number
  pageSize: number
  total: number
}

const notConnected = (what: string) =>
  new Error(`Chức năng ${what} chưa được kết nối với máy chủ.`)

// Conflicts an admin can hit from the review and queue screens; the API text is English
const CONFLICTS: Record<string, string> = {
  DOCUMENT_NOT_PENDING: 'Văn bản đã được duyệt hoặc từ chối trước đó.',
  DOCUMENT_PARSE_FAILED: 'Văn bản bóc tách lỗi nên không thể index.',
  DOCUMENT_NOT_INDEX_FAILED:
    'Chỉ thử lại được văn bản lỗi index; văn bản lỗi bóc tách cần tải lên lại.',
  INDEX_RETRY_EXCEEDED: 'Đã thử lại index quá số lần cho phép.',
}

const explain = (e: unknown) =>
  e instanceof ApiError && e.code && CONFLICTS[e.code]
    ? new ApiError(CONFLICTS[e.code], e.status, e.code)
    : e

interface DocumentActionDto {
  status: string
  lastError: string | null
}

/** approve / retry-index: ingestion chunks and embeds in ai-service before it answers */
async function indexDocument(
  documentId: string,
  action: 'approve' | 'retry-index'
) {
  try {
    const res = await api.post<Envelope<DocumentActionDto>>(
      `${DOCUMENTS}/${encodeURIComponent(documentId)}/${action}`,
      undefined,
      // ingestion waits up to 10 min for ai-service; the default 15 s would report a failure that did not happen
      { timeout: 600_000 }
    )
    return res.data
  } catch (e) {
    throw explain(e)
  }
}

// Statuses each table filter reads; REJECTED versions never show in the queue
const STATUSES: Record<QueueFilter, string[]> = {
  collect: ['PENDING', 'APPROVED', 'INDEX_FAILED', 'INDEXED'],
  parse: ['PENDING'],
  review: ['PENDING'],
  index: ['APPROVED', 'INDEX_FAILED'],
  indexed: ['INDEXED'],
  failed: ['PENDING', 'INDEX_FAILED'],
}

// shortcut: the newest 100 versions (the API maximum); page through them when the list grows
async function listDocuments(statuses: string[], signal?: AbortSignal) {
  // Repeated keys (status=A&status=B): axios would send status[]=A, which ASP.NET does not bind
  const params = new URLSearchParams([
    ...statuses.map((s) => ['status', s]),
    ['page', '1'],
    ['pageSize', '100'],
  ])
  const res = await api.get<Envelope<Page<DocumentSummaryDto>>>(DOCUMENTS, {
    params,
    signal,
  })
  return res.data.items.map(toKnowledgeDocument)
}

async function preview(documentId: string, signal?: AbortSignal) {
  const res = await api.get<Envelope<DocumentPreviewDto>>(
    `${DOCUMENTS}/${encodeURIComponent(documentId)}/preview`,
    { signal }
  )
  return res.data
}

export async function getPipelineSummary(
  signal?: AbortSignal
): Promise<PipelineSummary> {
  if (isKnowledgeDemo) return structuredClone((await fixtures()).mockSummary)
  const res = await api.get<
    Envelope<{
      pipeline: KnowledgePipelineDto
      months: { crawled: number; uploaded: number }[]
    }>
  >('/api/v1/knowledge/stats', { params: { months: 1 }, signal })
  const month = res.data.months.at(-1)
  return toPipelineSummary(
    res.data.pipeline,
    month ? month.crawled + month.uploaded : 0
  )
}

/** stage = 'collect' → mọi văn bản đã thu thập; 'failed' → văn bản đang lỗi (bóc tách hoặc index) */
export async function getDocuments(
  stage: QueueFilter,
  signal?: AbortSignal
): Promise<KnowledgeDocument[]> {
  const docs = isKnowledgeDemo
    ? structuredClone((await fixtures()).mockDocuments)
    : await listDocuments(STATUSES[stage], signal)
  if (stage === 'collect') return docs
  if (stage === 'failed') return docs.filter((d) => d.failure)
  return docs.filter((d) => d.stage === stage)
}

/** Thử lại ngay bước bị lỗi (index hoặc bóc tách) */
export async function retryDocument(documentId: string) {
  if (isKnowledgeDemo) {
    const f = await fixtures()
    const d = f.mockDocuments.find((x) => x.id === documentId)
    if (!d?.failure) return
    const index = d.failure.kind === 'INDEX_FAILED'
    f.mockSummary[index ? 'indexFailed' : 'parseFailed'] -= 1
    f.mockSummary[index ? 'indexing' : 'parsing'] += 1
    delete d.failure
    return
  }
  const result = await indexDocument(documentId, 'retry-index')
  if (result.status === 'INDEX_FAILED')
    throw new Error(
      `Index vẫn lỗi: ${result.lastError ?? 'không rõ nguyên nhân'}`
    )
}

/* ── Kiểm tra phiên bản ── */
/** null = văn bản không có phiên bản cần so sánh */
export async function getVersionComparison(
  documentId: string,
  _signal?: AbortSignal
): Promise<VersionComparison | null> {
  if (isKnowledgeDemo) {
    const c = (await fixtures()).mockComparisons[documentId]
    return c ? structuredClone(c) : null
  }
  // Ingestion does not compare versions yet; the page then says there is nothing to compare
  return null
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
  if (isKnowledgeDemo) {
    const d = (await fixtures()).getMockDetail(documentId)
    const retired = retiredDemo.get(documentId)
    if (!d || !retired) return d
    const current = d.versions.find((v) => v.no === d.currentVersion)
    if (current) current.status = 'RETIRED'
    d.history.unshift({
      at: retired.at,
      actor: 'Bạn',
      text: `Ngừng sử dụng v${d.currentVersion}: ${retired.reason}`,
    })
    return d
  }
  return toDocumentDetail(await preview(documentId, signal))
}

/* ── Rà soát nội dung bóc tách ── */
/** null = văn bản chưa có nội dung bóc tách */
export async function getDocumentReview(
  documentId: string,
  signal?: AbortSignal
): Promise<DocumentReview | null> {
  if (isKnowledgeDemo) {
    const r = (await fixtures()).mockReviews[documentId]
    return r ? structuredClone(r) : null
  }
  const review = toDocumentReview(await preview(documentId, signal))
  const reviewed = reviewedUnits.get(documentId)
  if (review && reviewed)
    for (const u of review.chapters
      .flatMap((c) => c.articles)
      .flatMap((a) => a.units))
      if (reviewed.has(u.id)) u.status = 'REVIEWED'
  return review
}

// shortcut: the review checklist lives in this tab because ingestion stores no per-unit review state;
// a reload starts the checklist over. Add a review-state endpoint if it must survive reloads or be shared.
const reviewedUnits = new Map<string, Set<string>>()

async function findUnitDemo(documentId: string, unitId: string) {
  const r = (await fixtures()).mockReviews[documentId]
  return r?.chapters
    .flatMap((c) => c.articles)
    .flatMap((a) => a.units)
    .find((u) => u.id === unitId)
}

export async function markUnitReviewed(documentId: string, unitId: string) {
  if (isKnowledgeDemo) {
    const u = await findUnitDemo(documentId, unitId)
    if (u) u.status = 'REVIEWED'
    return
  }
  reviewedUnits.set(
    documentId,
    (reviewedUnits.get(documentId) ?? new Set<string>()).add(unitId)
  )
}

/** Sửa nội dung một đơn vị; sửa xong coi như đã rà soát */
export async function saveUnitText(
  documentId: string,
  unitId: string,
  text: string
) {
  if (isKnowledgeDemo) {
    const u = await findUnitDemo(documentId, unitId)
    if (u) Object.assign(u, { text, status: 'REVIEWED' })
    return
  }
  throw notConnected('sửa nội dung bóc tách')
}

/** Duyệt nội dung → chuyển sang bước Index */
export async function approveDocument(documentId: string, _body: ApproveInput) {
  if (isKnowledgeDemo) return leaveReviewDemo(documentId, 'index')
  const result = await indexDocument(documentId, 'approve')
  // The approval is saved even when indexing fails; say so instead of reporting success
  if (result.status === 'INDEX_FAILED')
    throw new Error(
      `Đã duyệt nhưng index lỗi: ${result.lastError ?? 'không rõ nguyên nhân'}`
    )
}

export async function rejectDocument(documentId: string, reason: string) {
  if (isKnowledgeDemo) return leaveReviewDemo(documentId, null)
  try {
    await api.post(`${DOCUMENTS}/${encodeURIComponent(documentId)}/reject`, {
      reason,
    })
  } catch (e) {
    throw explain(e)
  }
}

/** REPROCESS_REQUIRED: send the version back to parsing; it must come back to review (BR-K08) */
export async function reprocessDocument(documentId: string, reason: string) {
  if (!reason.trim()) throw new Error('Vui lòng nhập lý do.')
  if (isKnowledgeDemo) return leaveReviewDemo(documentId, 'parse')
  throw new Error('Chức năng bóc tách lại chưa được kết nối với máy chủ.')
}

// Demo only: documents retired in this browser session
const retiredDemo = new Map<string, { at: string; reason: string }>()

/** Stop using an indexed version; RAG no longer retrieves it (FR-054) */
export async function retireDocument(documentId: string, reason: string) {
  if (!reason.trim()) throw new Error('Vui lòng nhập lý do.')
  if (isKnowledgeDemo) {
    retiredDemo.set(documentId, { at: new Date().toISOString(), reason })
    return
  }
  throw new Error('Chức năng ngừng sử dụng chưa được kết nối với máy chủ.')
}

/** Chấp nhận phiên bản mới, chuyển sang bước Bóc tách */
export async function continueVersionReview(documentId: string) {
  if (isKnowledgeDemo) return leaveReviewDemo(documentId, 'parse')
  throw notConnected('kiểm tra phiên bản')
}

export async function rejectVersion(documentId: string, _reason: string) {
  if (isKnowledgeDemo) return leaveReviewDemo(documentId, null)
  throw notConnected('kiểm tra phiên bản')
}

/* ── Tải lên ── */
// shortcut: uploads made in this tab only; read them from the API once ingestion lists past uploads
const sessionUploads: UploadResult[] = []

/** Kết quả các lần tải lên gần đây của người dùng, mới nhất trước */
export async function getUploads(): Promise<UploadResult[]> {
  if (isKnowledgeDemo) return structuredClone((await fixtures()).mockUploads)
  return [...sessionUploads]
}

/** onProgress nhận 0–100 theo số byte đã gửi */
export async function uploadDocument(
  file: File,
  meta: UploadMeta,
  onProgress: (percent: number) => void
) {
  if (isKnowledgeDemo) {
    onProgress(100)
    // MOCK: file mới luôn vào hàng đợi; BE mới biết trùng/phiên bản mới/lỗi bóc tách
    ;(await fixtures()).mockUploads.unshift({
      id: `up-${Date.now()}`,
      fileName: file.name,
      number: meta.number,
      result: 'QUEUED',
      documentId: null,
      uploadedAt: new Date().toISOString(),
    })
    return
  }
  const body = new FormData()
  body.append('file', file)
  body.append('documentNumber', meta.number)
  body.append('docType', meta.docType)
  body.append('issuingAuthority', meta.issuer)
  body.append('title', meta.title ?? '')
  if (meta.issuedAt) body.append('issuedDate', meta.issuedAt)
  if (meta.effectiveAt) body.append('effectiveFrom', meta.effectiveAt)
  const at = new Date().toISOString()
  try {
    // apiClient mặc định gửi JSON; FormData cần header multipart
    const res = await api.post<Envelope<UploadedDocumentDto>>(
      `${DOCUMENTS}/upload`,
      body,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
        // A 20 MB file on a slow line outlasts the default 15 s timeout
        timeout: 120_000,
        onUploadProgress: (e) =>
          e.total && onProgress(Math.round((e.loaded / e.total) * 100)),
      }
    )
    sessionUploads.unshift(uploadedResult(file.name, res.data))
  } catch (e) {
    const rejected =
      e instanceof ApiError
        ? rejectedResult(file.name, meta.number, e.code, at)
        : null
    if (!rejected) throw e
    sessionUploads.unshift(rejected)
  }
}
