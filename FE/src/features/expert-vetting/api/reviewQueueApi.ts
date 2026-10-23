import { api } from '@/lib/api-client'
import type { Paged } from '@/lib/pagination'
import type {
  ApplicationStatus,
  ExpertApplication,
  QualificationRow,
  QualificationScope,
  QualificationStatus,
} from '../types'

interface Envelope<T> {
  data: T
}

/** One row of the server-side review queue: an eligibility application or a service qualification */
export interface ReviewQueueRow {
  id: string
  gate: 'GATE_1' | 'GATE_2'
  applicantUserId: string
  displayName: string | null
  yearsExperience: number | null
  fields: string[]
  serviceCode: string | null
  serviceName: string | null
  status: string
  submittedAt: string | null
  isReapplication: boolean
  /** Reviewer holding it now; null when nobody does (an expired claim counts as nobody) */
  claimedByUserId?: string | null
  claimedByEmail?: string | null
  /** Server time when the claim lapses; null while waiting for the expert */
  claimExpiresAt?: string | null
  heldByMe?: boolean
}

interface ReviewQueuePage {
  items: ReviewQueueRow[]
  page: number
  pageSize: number
  total: number
}

export interface ReviewQueueCounts {
  applications: Record<string, number>
  qualifications: Record<string, number>
  /** Per status, only what the caller holds or nobody holds */
  availableApplications?: Record<string, number>
  availableQualifications?: Record<string, number>
}

/** Which reviews to show by who holds them; the server default is MINE_OR_UNCLAIMED */
export type ClaimFilter = 'MINE_OR_UNCLAIMED' | 'MINE' | 'UNCLAIMED' | 'ALL'

export interface ReviewQueueParams {
  /** Leave empty to leave applications out of the page */
  applicationStatuses: readonly string[]
  /** Leave empty to leave qualifications out of the page */
  qualificationStatuses: readonly string[]
  search: string
  /** First page is 1 */
  page: number
  pageSize: number
  /** Reviewer queue only; leave out for the server default (mine or unclaimed) */
  claim?: ClaimFilter
}

const REVIEW = '/api/v1/admin/experts/review-queue'
const APPROVAL = '/api/v1/admin/experts/approvals/queue'
// Repeat a key for each status (status=A&status=B), the form ASP.NET Core binds to an array
const repeatKeys = { indexes: null }

/**
 * One page of a queue, filtered, counted and ordered on the server. Final approval (System Admin) only
 * pages qualifications through its own route.
 */
export async function searchReviewQueue(
  scope: QualificationScope,
  params: ReviewQueueParams,
  signal?: AbortSignal
): Promise<ReviewQueuePage> {
  const search = params.search.trim() || undefined
  const query =
    scope === 'approval'
      ? { status: params.qualificationStatuses, q: search, page: params.page, pageSize: params.pageSize }
      : {
          applicationStatus: params.applicationStatuses,
          qualificationStatus: params.qualificationStatuses,
          q: search,
          page: params.page,
          pageSize: params.pageSize,
          claim: params.claim,
        }
  const res = await api.get<Envelope<ReviewQueuePage>>(scope === 'approval' ? APPROVAL : REVIEW, {
    params: query,
    paramsSerializer: repeatKeys,
    signal,
  })
  return res.data
}

/** Records per status, for tab counts and sidebar badges */
export async function getReviewQueueCounts(scope: QualificationScope, signal?: AbortSignal) {
  const res = await api.get<Envelope<ReviewQueueCounts>>(
    scope === 'approval' ? `${APPROVAL}/counts` : `${REVIEW}/counts`,
    { signal }
  )
  return res.data
}

/** Sum of the counts of some statuses */
export const countOf = (counts: Record<string, number> | undefined, statuses: readonly string[]) =>
  counts ? statuses.reduce((sum, status) => sum + (counts[status] ?? 0), 0) : undefined

/** Server page → the paging shape the admin tables already use (page index starts at zero) */
export function toPaged<T>(rows: T[], page: number, pageSize: number, total: number): Paged<T> {
  const pageCount = Math.max(1, Math.ceil(total / pageSize))
  const pageIndex = page - 1
  return {
    rows,
    total,
    from: total ? pageIndex * pageSize + 1 : 0,
    to: total ? pageIndex * pageSize + rows.length : 0,
    canPrev: pageIndex > 0,
    canNext: pageIndex < pageCount - 1,
    pageIndex,
    pageSize,
    pageCount,
  }
}

export const toApplicationRow = (r: ReviewQueueRow): ExpertApplication => ({
  id: r.id,
  name: r.displayName ?? r.applicantUserId,
  years: r.yearsExperience ?? 0,
  aiFlags: 0,
  submittedAt: r.submittedAt ?? '',
  status: r.status as ApplicationStatus,
  fields: r.fields,
  isReapplication: r.isReapplication,
})

export const toQualificationRow = (r: ReviewQueueRow): QualificationRow => ({
  id: r.id,
  name: r.displayName ?? r.applicantUserId,
  years: r.yearsExperience ?? 0,
  fields: r.fields,
  serviceCode: r.serviceCode ?? '',
  serviceName: r.serviceName ?? undefined,
  status: r.status as QualificationStatus,
  submittedAt: r.submittedAt ?? '',
  isReapplication: r.isReapplication,
})
