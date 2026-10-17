import { api } from '@/lib/api-client'
import { APPLICATION_STATUS } from '@/lib/constants'
import { isExpertDemo } from '@/lib/expert-data-source'
import { CURRENT_ADMIN, QUEUE_STATUSES } from '../constants'
import type {
  ApplicationDetail,
  ApplicationStatus,
  EligibilityCheck,
  EligibilityDecisionInput,
  EligibilityResult,
  Expert,
  ExpertApplication,
} from '../types'

/* Demo mode reads fixtures (a copy, so React Query sees new data);
 * demo mutations edit the fixtures so the next refetch sees the change. */
const fixtures = () => import('./fixtures')
const BASE = '/api/admin'
// Gate 1 review of expert applications (expert service, permission ExpertReview)
const REVIEW_BASE = '/api/v1/admin/experts/applications'

interface Envelope<T> {
  success: boolean
  data: T
  message?: string
}

interface ReviewQueueItem {
  id: string
  applicantUserId: string
  displayName: string | null
  yearsExperience: number | null
  fields: string[]
  status: ApplicationStatus
  submittedAt: string | null
  isReapplication: boolean
}

interface ReviewApplication {
  id: string
  applicantUserId: string
  status: ApplicationStatus
  submittedAt: string | null
  decidedAt: string | null
  decisionNote: string | null
  earliestReapplyAt: string | null
  previousApplicationId: string | null
  createdAt: string
  profile: {
    displayName: string | null
    phone: string | null
    birthDate: string | null
    title: string | null
    company: string | null
    location: string | null
    bio: string | null
    yearsExperience: number | null
    fields: string[]
    highlights: string | null
  }
  evidence: {
    id: string
    code: string
    fileName: string
    contentType: string
    sizeBytes: number
    uploadedAt: string
  }[]
  history: {
    fromStatus: ApplicationStatus | null
    toStatus: ApplicationStatus
    note: string | null
    at: string
    actorUserId: string
    byApplicant: boolean
  }[]
  eligibility: EligibilityCheck[]
  minYearsExperience: number
  suggestedExperienceResult: EligibilityResult
  canDecide: boolean
}

const toQueueRow = (a: ReviewQueueItem): ExpertApplication => ({
  id: a.id,
  name: a.displayName ?? a.applicantUserId,
  years: a.yearsExperience ?? 0,
  aiFlags: 0,
  submittedAt: a.submittedAt ?? '',
  status: a.status,
  fields: a.fields,
  isReapplication: a.isReapplication,
})

function toDetail(a: ReviewApplication): ApplicationDetail {
  const p = a.profile
  const name = p.displayName ?? a.applicantUserId
  return {
    id: a.id,
    name,
    years: p.yearsExperience ?? 0,
    aiFlags: 0,
    submittedAt: a.submittedAt ?? a.createdAt,
    status: a.status,
    birthDate: p.birthDate ?? '',
    jobTitle: p.title ?? '',
    company: p.company ?? '',
    location: p.location ?? '',
    bio: p.bio ?? '',
    fields: p.fields,
    highlights: p.highlights ?? '',
    documents: a.evidence.map((e) => ({
      code: e.code,
      name: e.fileName,
      pages: [],
      evidenceId: e.id,
    })),
    // Empty actor = a reviewer; the history tab shows a generic label
    history: a.history.map((h) => {
      const label = APPLICATION_STATUS[h.toStatus]?.label ?? h.toStatus
      return {
        at: h.at,
        actor: h.byApplicant ? name : '',
        text: h.note ? `${label}: ${h.note}` : `${label}.`,
      }
    }),
    eligibility: a.eligibility,
    minYearsExperience: a.minYearsExperience,
    suggestedExperienceResult: a.suggestedExperienceResult,
    canDecide: a.canDecide,
    decidedAt: a.decidedAt,
    decisionNote: a.decisionNote,
    earliestReapplyAt: a.earliestReapplyAt,
  }
}

/* ── Expert vetting (Gate 1) ── */
export async function getApplications(signal?: AbortSignal) {
  if (isExpertDemo) return structuredClone((await fixtures()).mockApplications)
  // The API lists one status per request; the queue tabs need all of them
  const lists = await Promise.all(
    QUEUE_STATUSES.map((status) =>
      api.get<Envelope<ReviewQueueItem[]>>(REVIEW_BASE, {
        params: { status },
        signal,
      })
    )
  )
  return lists.flatMap((l) => l.data.map(toQueueRow))
}

/** null = not found (demo); the API turns 404 into an ApiError */
export async function getApplicationDetail(
  id: string,
  signal?: AbortSignal
): Promise<ApplicationDetail | null> {
  if (isExpertDemo)
    return (await fixtures()).getMockApplicationDetail(id) ?? null
  const res = await api.get<Envelope<ReviewApplication>>(
    `${REVIEW_BASE}/${id}`,
    { signal }
  )
  return toDetail(res.data)
}

/** File content of one uploaded document; null in demo (fixtures have no files) */
export async function getEvidenceFile(id: string, evidenceId: string) {
  if (isExpertDemo) return null
  return api.get<Blob>(`${REVIEW_BASE}/${id}/evidence/${evidenceId}/file`, {
    responseType: 'blob',
    timeout: 60_000,
  })
}

/** Records the Gate 1 decision; the server derives the outcome from the results */
export async function decideEligibility(
  id: string,
  body: EligibilityDecisionInput
): Promise<ApplicationDetail | null> {
  if (isExpertDemo) {
    const f = await fixtures()
    f.decideMockEligibility(id, body)
    return f.getMockApplicationDetail(id) ?? null
  }
  const res = await api.post<Envelope<ReviewApplication>>(
    `${REVIEW_BASE}/${id}/eligibility-decision`,
    body
  )
  return toDetail(res.data)
}

/* ── Expert management ──
 * TODO(api): the BE has no expert management endpoints yet; these paths are placeholders. */
export async function getExperts(signal?: AbortSignal) {
  if (isExpertDemo) return structuredClone((await fixtures()).mockExperts)
  return api.get<Expert[]>(`${BASE}/experts`, { signal })
}

export async function setExpertServiceStatus(
  id: string,
  status: Expert['serviceStatus']
) {
  if (isExpertDemo) {
    const e = (await fixtures()).mockExperts.find((x) => x.id === id)
    if (!e) return
    e.serviceStatus = status
    e.history.unshift({
      at: new Date().toISOString(),
      actor: CURRENT_ADMIN,
      text: status === 'SUSPENDED' ? 'tạm ngưng dịch vụ.' : 'mở lại dịch vụ.',
    })
    return
  }
  await api.put(`${BASE}/experts/${id}/service-status`, { status })
}
