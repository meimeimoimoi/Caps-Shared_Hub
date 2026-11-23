/** Figures of one month of the knowledge base */
export interface KnowledgeStatPeriod {
  /** First day of the month, YYYY-MM-DD */
  start: string
  /** Month still running: never used for up/down comparisons */
  partial?: boolean
  /** Versions brought in by crawls / uploaded by hand, by arrival */
  crawled: number
  uploaded: number
  /** Versions indexed into the base: first versions / later versions */
  newDocuments: number
  newVersions: number
}

/** Where the document versions are right now */
export interface KnowledgePipeline {
  awaitingContent: number
  awaitingReview: number
  approved: number
  indexed: number
  rejected: number
  parseFailed: number
  indexFailed: number
}

export interface CrawlRunSummary {
  id: string
  triggerType: string
  status: string
  startedAt: string
  finishedAt: string | null
  documentsFound: number
  newDocuments: number
  newVersions: number
}

/** GET /api/v1/knowledge/stats */
export interface KnowledgeStats {
  pipeline: KnowledgePipeline
  /** Last 12 months, oldest first */
  months: KnowledgeStatPeriod[]
  /** Documents with an indexed version, per document type */
  byDocType: { docType: string; count: number }[]
  /** Documents waiting for review, by whole days waited */
  pendingAges: { days: number; count: number }[]
  /** Latest crawls, newest first */
  recentRuns: CrawlRunSummary[]
}
