import type { CollectionRun } from '../types'

/** A crawl job as ingestion returns it (GET /api/v1/knowledge/crawl-jobs) */
export interface CrawlJobDto {
  id: string
  triggerType: string
  triggeredBy: string | null
  status: 'RUNNING' | 'SUCCEEDED' | 'FAILED'
  docsFound: number
  detail: {
    progress?: {
      stage?: string
      done?: number
      total?: number | null
      message?: string | null
    }
    result?: {
      error?: string
      documents?: {
        documentNumber: string
        parseStatus: string
        imported: boolean
      }[]
    } | null
  } | null
  startedAt: string
  finishedAt: string | null
}

// Milestones the crawler worker reports (ReportCrawlProgressRequest.Stage)
const STAGE: Record<string, string> = {
  SEARCHING: 'Đang tìm văn bản',
  DETAILS: 'Đang lấy chi tiết',
  RELATIONS: 'Đang lấy quan hệ sửa đổi',
  EXPORTING: 'Đang bóc tách',
  POSTING: 'Đang đưa vào hàng đợi',
}

/** One row of the crawl history; a document already stored (same file) counts as unchanged */
export function toCollectionRun(job: CrawlJobDto): CollectionRun {
  const docs = job.detail?.result?.documents ?? []
  const progress = job.detail?.progress
  const steps =
    progress?.total != null ? `${progress.done ?? 0}/${progress.total}` : ''
  const note =
    job.status === 'RUNNING'
      ? progress?.stage
        ? `${STAGE[progress.stage] ?? progress.stage} ${steps}`.trim()
        : undefined
      : job.status === 'FAILED'
        ? (job.detail?.result?.error ?? 'Không rõ lỗi')
        : undefined
  return {
    id: job.id,
    at: job.startedAt,
    trigger: job.triggerType === 'MANUAL' ? 'MANUAL' : 'SCHEDULED',
    status: job.status,
    note,
    newDocs: docs.filter((d) => d.imported).length,
    unchanged: docs.filter((d) => !d.imported).length,
    errors: docs.filter((d) => d.parseStatus !== 'PARSED').length,
  }
}

/** Result text of a run, shared by the sources page and the dashboard */
export function runResult(r: CollectionRun) {
  if (r.status === 'RUNNING')
    return r.note ? `Đang chạy · ${r.note}` : 'Đang chạy'
  if (r.status === 'FAILED') return 'Thất bại'
  const versions =
    r.newVersions === undefined ? '' : ` · ${r.newVersions} phiên bản mới`
  return `${r.newDocs} văn bản mới${versions} · ${r.unchanged} không đổi`
}
