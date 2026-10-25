import { api } from '@/lib/api-client'
import type { ClaimFilter, ReviewQueueParams, ReviewQueueRow } from './reviewQueueApi'
import type { ReviewClaimState } from '../types'

interface Envelope<T> {
  data: T
}

interface AssignmentPage {
  items: ReviewQueueRow[]
  page: number
  pageSize: number
  total: number
}

/** A reviewer a System Admin can hand a review to (recorded when they open the review queue) */
export interface KnownReviewer {
  userId: string
  email: string | null
  lastSeenAt: string
}

// System Admin view of who works on each open review (permission ExpertApprove)
const BASE = '/api/v1/admin/experts/review-assignments'
// Repeat a key for each status (status=A&status=B), the form ASP.NET Core binds to an array
const repeatKeys = { indexes: null }

/** One page of open reviews of both gates with their holders */
export async function searchAssignments(
  params: ReviewQueueParams & { claim: ClaimFilter },
  signal?: AbortSignal
): Promise<AssignmentPage> {
  const res = await api.get<Envelope<AssignmentPage>>(BASE, {
    params: {
      applicationStatus: params.applicationStatuses,
      qualificationStatus: params.qualificationStatuses,
      q: params.search.trim() || undefined,
      page: params.page,
      pageSize: params.pageSize,
      claim: params.claim,
    },
    paramsSerializer: repeatKeys,
    signal,
  })
  return res.data
}

export async function getKnownReviewers(signal?: AbortSignal) {
  const res = await api.get<Envelope<KnownReviewer[]>>(`${BASE}/reviewers`, { signal })
  return res.data
}

/** Hands a review to another reviewer; the reason is required and kept in the claim history */
export async function reassignReview(
  gate: 'GATE_1' | 'GATE_2',
  id: string,
  body: { reviewerUserId: string; reason: string }
): Promise<ReviewClaimState> {
  const kind = gate === 'GATE_1' ? 'applications' : 'qualifications'
  const res = await api.post<Envelope<ReviewClaimState>>(`${BASE}/${kind}/${id}`, body)
  return res.data
}
