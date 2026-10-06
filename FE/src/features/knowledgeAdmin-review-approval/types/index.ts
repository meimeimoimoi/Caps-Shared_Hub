import type { PipelineStage } from '../constants'

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
  indexed: number
}
