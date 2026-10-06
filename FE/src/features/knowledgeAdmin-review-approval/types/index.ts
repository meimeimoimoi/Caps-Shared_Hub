import type { DOCUMENT_STATUS } from '@/lib/constants'
import type {
  CrosscheckKey,
  PipelineStage,
  UNIT_STATUS,
} from '../constants'

export interface KnowledgeDocument {
  id: string
  /** Số hiệu, vd. 78/2014/TT-BTC */
  number: string
  title: string
  docType: string // Thông tư, Nghị định, VB hợp nhất...
  source: 'UPLOAD' | 'CRAWL'
  stage: Exclude<PipelineStage, 'collect'>
  /** null = văn bản mới; có giá trị = phiên bản mới của văn bản đã có */
  version: { no: number; changed: boolean } | null
  parseWarnings: number
  effectiveAt: string | null
  queuedAt: string
  /** Có giá trị = đang lỗi (index hoặc bóc tách) */
  failure?: DocumentFailure
}

export interface DocumentFailure {
  kind: 'INDEX_FAILED' | 'PARSE_FAILED'
  title: string // vd. "Không index được vào Qdrant"
  message: string
  /** Mã tham chiếu để báo bộ phận kỹ thuật */
  ref: string
  attempts: number
  /** null = đã quá ngưỡng retry, không tự thử nữa */
  nextRetryAt: string | null
  /** Phiên bản cũ AI/RAG đang dùng; null = văn bản mới */
  previousVersion: string | null
  log: { at: string; text: string }[]
}

/** Một khoản/điểm trong Điều; change đánh dấu phần bị bỏ (bản cũ) hoặc thêm (bản mới) */
export interface Clause {
  text: string
  change?: 'removed' | 'added'
}

export interface ArticleChange {
  article: number
  heading: string // vd. "Điều 6. Các khoản chi được trừ..."
  kind: 'MODIFIED' | 'ADDED' | 'REMOVED'
  /** null = Điều chưa có ở bản cũ (ADDED) */
  before: Clause[] | null
  /** null = Điều bị bỏ ở bản mới (REMOVED) */
  after: Clause[] | null
}

/** So sánh phiên bản mới thu thập với phiên bản đang dùng */
export interface VersionComparison {
  documentId: string
  number: string
  title: string
  version: number
  prevVersion: number
  collectedAt: string
  collectedBy: 'AUTO' | 'MANUAL'
  changes: ArticleChange[]
}

/* ── Rà soát nội dung bóc tách ── */
export type UnitStatus = keyof typeof UNIT_STATUS

/** Một đơn vị đã bóc tách: tiêu đề Điều, Khoản hoặc Điểm */
export interface ReviewUnit {
  id: string
  label: string // vd. "Điều 6 · Tiêu đề", "Khoản 1 · Điểm a"
  text: string
  status: UnitStatus
  /** Lý do AI cần kiểm tra (chỉ khi status = WARNING) */
  warning?: string
  heading?: boolean
}

export interface ReviewArticle {
  id: string
  number: number
  title: string
  units: ReviewUnit[]
}

export interface DocumentReview {
  documentId: string
  /** Link bản gốc (PDF/DOCX hoặc trang vbpl.vn) */
  sourceUrl: string
  meta: UploadMeta
  title: string
  chapters: { title: string; articles: ReviewArticle[] }[]
}

export interface ApproveInput {
  meta: UploadMeta
  crosscheck: CrosscheckKey[]
}

/* ── Chi tiết văn bản (Tất cả văn bản) ── */
export interface DocumentVersion {
  no: number
  collectedAt: string
  source: KnowledgeDocument['source']
  reviewer: string | null
  reviewedAt: string | null
  status: keyof typeof DOCUMENT_STATUS
}

/** Đoạn đã chia và index vào vector DB */
export interface IndexedChunk {
  id: string
  path: string // vd. "Điều 6 · Khoản 2 · Điểm 2.5"
  text: string
}

export interface DocumentDetail {
  id: string
  number: string
  title: string
  docType: string
  issuer: string
  currentVersion: number
  /** Thời điểm xong từng bước, theo thứ tự RAIL_DOCUMENT; null = chưa tới */
  timeline: (string | null)[]
  /** null = chưa index */
  rag: {
    approvedBy: string
    approvedAt: string
    chunkCount: number
    vectorCount: number
    indexedAt: string
  } | null
  versions: DocumentVersion[]
  /** Mẫu vài đoạn đầu; tổng số ở rag.chunkCount */
  chunks: IndexedChunk[]
  chapters: DocumentReview['chapters']
  history: { at: string; actor: string; text: string }[]
}

/** Thông tin bắt buộc khi tải văn bản lên (ngày dạng yyyy-mm-dd) */
export interface UploadMeta {
  number: string
  docType: string
  issuer: string
  issuedAt: string
  effectiveAt: string
}

/** Số đếm cho thanh quy trình */
export interface PipelineSummary {
  collectedThisMonth: number
  parsing: number
  pending: number
  indexing: number
  indexFailed: number
  parseFailed: number
  indexed: number
}
