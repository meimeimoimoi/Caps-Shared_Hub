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
