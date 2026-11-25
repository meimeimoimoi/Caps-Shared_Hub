import type { DOCUMENT_STATUS } from '@/lib/constants'
import type {
  DocumentDetail,
  DocumentFailure,
  DocumentReview,
  KnowledgeDocument,
  PipelineSummary,
  ReviewArticle,
} from '../types'

/** A document version in ingestion's review queue (DocumentSummaryResponse) */
export interface DocumentSummaryDto {
  id: string
  legalSourceId: string
  documentNumber: string
  docType: string
  title: string
  versionNo: number
  source: string
  status: string
  issuedDate: string | null
  effectiveFrom: string | null
  hasContent: boolean
  lastError: string | null
  createdAt: string
}

/** One version for the split-screen review (DocumentPreviewResponse) */
export interface DocumentPreviewDto {
  id: string
  documentNumber: string
  docType: string
  issuingAuthority: string | null
  title: string
  versionNo: number
  source: string
  status: string
  issuedDate: string | null
  effectiveFrom: string | null
  approvedBy: string | null
  approvedAt: string | null
  rejectionReason: string | null
  lastError: string | null
  createdAt: string
  contentJson: ContentJson | null
  /** API path of the stored original (uploads only); needs the access token */
  fileUrl: string | null
  /** Page of a crawled document on its site */
  sourceUrl: string | null
}

/** content_json written by the crawler parser (legal_parser.to_content_json) */
interface ContentJson {
  chapters?: {
    number: string | null
    title: string
    articles: {
      number: string
      title: string
      units: {
        id: string
        label: string
        text: string
        status: string
        warning?: string
      }[]
    }[]
  }[]
}

const UPLOAD = 'MANUAL_UPLOAD'

const failure = (d: DocumentSummaryDto): DocumentFailure => ({
  kind: 'PARSE_FAILED',
  title: 'Không bóc tách được',
  message: d.lastError ?? '',
  ref: d.id,
  attempts: 1,
  nextRetryAt: null,
  previousVersion: d.versionNo > 1 ? `v${d.versionNo - 1}` : null,
  log: [{ at: d.createdAt, text: d.lastError ?? '' }],
})

/** A PENDING version: in review once the worker has split it, parsing (or failed) before that */
export function toKnowledgeDocument(d: DocumentSummaryDto): KnowledgeDocument {
  return {
    id: d.id,
    number: d.documentNumber,
    title: d.title,
    docType: d.docType,
    source: d.source === UPLOAD ? 'UPLOAD' : 'CRAWL',
    stage: d.hasContent ? 'review' : 'parse',
    version: d.versionNo > 1 ? { no: d.versionNo, changed: true } : null,
    parseWarnings: 0,
    effectiveAt: d.effectiveFrom,
    queuedAt: d.createdAt,
    ...(d.lastError ? { failure: failure(d) } : {}),
  }
}

/** shortcut: counted from the pending queue only; index counts stay 0 until ingestion reports them */
export function toPipelineSummary(docs: KnowledgeDocument[]): PipelineSummary {
  return {
    collectedThisMonth: 0,
    parsing: docs.filter((d) => d.stage === 'parse' && !d.failure).length,
    pending: docs.filter((d) => d.stage === 'review').length,
    indexing: 0,
    indexFailed: 0,
    parseFailed: docs.filter((d) => d.failure).length,
    indexed: 0,
  }
}

const chapterTitle = (c: { number: string | null; title: string }) =>
  c.number
    ? `Chương ${c.number}${c.title ? ` · ${c.title}` : ''}`
    : c.title || 'Không thuộc chương nào'

function toChapters(content: ContentJson | null): DocumentReview['chapters'] {
  return (content?.chapters ?? []).map((c, ci) => ({
    title: chapterTitle(c),
    articles: c.articles.map((a, ai): ReviewArticle => ({
      // Article numbers repeat across chapters in amending documents, so the position makes the id
      id: `a-${ci}-${ai}`,
      // Old documents number sections in roman numerals: fall back to the position
      number: Number.parseInt(a.number, 10) || ai + 1,
      title: a.title,
      units: a.units.map((u) => ({
        id: u.id,
        label: u.label,
        text: u.text,
        status: u.status === 'WARNING' ? 'WARNING' : 'AUTO',
        ...(u.warning ? { warning: u.warning } : {}),
      })),
    })),
  }))
}

/** null = the worker has not split the file yet */
export function toDocumentReview(p: DocumentPreviewDto): DocumentReview | null {
  if (!p.contentJson?.chapters) return null
  return {
    documentId: p.id,
    sourceUrl: p.fileUrl ?? p.sourceUrl ?? '',
    meta: {
      number: p.documentNumber,
      docType: p.docType,
      issuer: p.issuingAuthority ?? '',
      issuedAt: p.issuedDate ?? '',
      effectiveAt: p.effectiveFrom ?? '',
    },
    title: p.title,
    chapters: toChapters(p.contentJson),
  }
}

const STATUS: Record<string, keyof typeof DOCUMENT_STATUS> = {
  PENDING: 'PENDING_REVIEW',
  APPROVED: 'APPROVED',
  INDEXED: 'INDEXED',
  INDEX_FAILED: 'INDEX_FAILED',
  REJECTED: 'REJECTED',
}

/** shortcut: one version and no per-step times; the upload time stands in for the steps before review */
export function toDocumentDetail(p: DocumentPreviewDto): DocumentDetail {
  const indexed = p.status === 'INDEXED' ? p.approvedAt : null
  return {
    id: p.id,
    number: p.documentNumber,
    title: p.title,
    docType: p.docType,
    issuer: p.issuingAuthority ?? '',
    currentVersion: p.versionNo,
    timeline: [
      p.createdAt,
      p.createdAt,
      p.contentJson ? p.createdAt : null,
      p.approvedAt,
      indexed,
    ],
    rag: null,
    versions: [
      {
        no: p.versionNo,
        collectedAt: p.createdAt,
        source: p.source === UPLOAD ? 'UPLOAD' : 'CRAWL',
        reviewer: p.approvedBy,
        reviewedAt: p.approvedAt,
        status:
          p.status === 'PENDING' && p.lastError
            ? 'PARSE_FAILED'
            : (STATUS[p.status] ?? 'PENDING_REVIEW'),
      },
    ],
    chunks: [],
    chapters: toChapters(p.contentJson),
    history: p.rejectionReason
      ? [
          {
            at: p.approvedAt ?? p.createdAt,
            actor: p.approvedBy ?? '',
            text: `Từ chối: ${p.rejectionReason}`,
          },
        ]
      : [],
  }
}
