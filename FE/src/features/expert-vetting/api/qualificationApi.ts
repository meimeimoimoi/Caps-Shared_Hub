import { api } from '@/lib/api-client'
import { QUALIFICATION_STATUS } from '@/lib/constants'
import { isExpertDemo } from '@/lib/expert-data-source'
import type {
  CompetencyCheck,
  CompetencyDecisionInput,
  EligibilityCheck,
  FinalApprovalInput,
  QualificationDetail,
  QualificationRow,
  QualificationScope,
  QualificationStatus,
} from '../types'

// Gate 2 review (permission ExpertReview) and final approval (System Admin) read the same records
const BASES: Record<QualificationScope, string> = {
  review: '/api/v1/admin/experts/qualifications',
  approval: '/api/v1/admin/experts/approvals',
}

interface Envelope<T> {
  success: boolean
  data: T
  message?: string
}

interface QueueItem {
  id: string
  applicantUserId: string
  displayName: string | null
  yearsExperience: number | null
  fields: string[]
  serviceCode: string
  status: QualificationStatus
  submittedAt: string
  isReapplication: boolean
}

interface ReviewQualification {
  id: string
  applicantUserId: string
  serviceCode: string
  serviceName: string
  status: QualificationStatus
  submittedAt: string
  decidedAt: string | null
  decisionNote: string | null
  earliestReapplyAt: string | null
  previousQualificationId: string | null
  applicationId: string
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
    fromStatus: QualificationStatus | null
    toStatus: QualificationStatus
    note: string | null
    at: string
    actorUserId: string
    byApplicant: boolean
  }[]
  eligibility: EligibilityCheck[]
  competencies: CompetencyCheck[]
  canDecide: boolean
  competencyReviewerUserId: string | null
  canFinalApprove: boolean
}

const toRow = (q: QueueItem): QualificationRow => ({
  id: q.id,
  name: q.displayName ?? q.applicantUserId,
  years: q.yearsExperience ?? 0,
  fields: q.fields,
  serviceCode: q.serviceCode,
  status: q.status,
  submittedAt: q.submittedAt,
  isReapplication: q.isReapplication,
})

function toDetail(q: ReviewQualification): QualificationDetail {
  const p = q.profile
  const name = p.displayName ?? q.applicantUserId
  return {
    id: q.id,
    serviceCode: q.serviceCode,
    serviceName: q.serviceName,
    status: q.status,
    submittedAt: q.submittedAt,
    decidedAt: q.decidedAt,
    decisionNote: q.decisionNote,
    earliestReapplyAt: q.earliestReapplyAt,
    previousQualificationId: q.previousQualificationId,
    canDecide: q.canDecide,
    competencyReviewerUserId: q.competencyReviewerUserId,
    canFinalApprove: q.canFinalApprove,
    competencies: q.competencies,
    // Gate 1 view of the expert: the profile, document and Gate 1 result tabs read it as is
    profile: {
      id: q.applicationId,
      name,
      years: p.yearsExperience ?? 0,
      aiFlags: 0,
      submittedAt: q.submittedAt,
      status: 'ELIGIBLE',
      birthDate: p.birthDate ?? '',
      jobTitle: p.title ?? '',
      company: p.company ?? '',
      location: p.location ?? '',
      bio: p.bio ?? '',
      fields: p.fields,
      highlights: p.highlights ?? '',
      documents: q.evidence.map((e) => ({
        code: e.code,
        name: e.fileName,
        pages: [],
        evidenceId: e.id,
      })),
      history: [],
      eligibility: q.eligibility,
      minYearsExperience: 0,
      suggestedExperienceResult: 'PASS',
      canDecide: false,
      decidedAt: q.eligibility[0]?.decidedAt ?? null,
      decisionNote: null,
      earliestReapplyAt: null,
    },
    // Empty actor = a reviewer; the history tab shows a generic label
    history: q.history.map((h) => {
      const label = QUALIFICATION_STATUS[h.toStatus]?.label ?? h.toStatus
      return {
        at: h.at,
        actor: h.byApplicant ? name : '',
        text: h.note ? `${label}: ${h.note}` : `${label}.`,
      }
    }),
  }
}

/** Every qualification in the given statuses; empty in demo mode (no Gate 2 fixtures) */
export async function getQualifications(
  scope: QualificationScope,
  statuses: readonly QualificationStatus[],
  signal?: AbortSignal
) {
  if (isExpertDemo) return []
  const lists = await Promise.all(
    statuses.map((status) =>
      api.get<Envelope<QueueItem[]>>(BASES[scope], {
        params: { status },
        signal,
      })
    )
  )
  return lists.flatMap((l) => l.data.map(toRow))
}

export async function getQualificationDetail(
  scope: QualificationScope,
  id: string,
  signal?: AbortSignal
): Promise<QualificationDetail | null> {
  if (isExpertDemo) return null
  const res = await api.get<Envelope<ReviewQualification>>(
    `${BASES[scope]}/${id}`,
    { signal }
  )
  return toDetail(res.data)
}

/** File content of one document the qualification can rely on */
export async function getQualificationFile(
  scope: QualificationScope,
  id: string,
  evidenceId: string
) {
  if (isExpertDemo) return null
  return api.get<Blob>(`${BASES[scope]}/${id}/evidence/${evidenceId}/file`, {
    responseType: 'blob',
    timeout: 60_000,
  })
}

/** Final approval by a System Admin: APPROVE or RETURN_FOR_REVIEW (note required) */
export async function decideFinalApproval(
  id: string,
  body: FinalApprovalInput
): Promise<QualificationDetail> {
  const res = await api.post<Envelope<ReviewQualification>>(
    `${BASES.approval}/${id}/final-decision`,
    body
  )
  return toDetail(res.data)
}

/** Records the Gate 2 decision; the server derives the outcome from the results */
export async function decideCompetency(
  id: string,
  body: CompetencyDecisionInput
): Promise<QualificationDetail> {
  const res = await api.post<Envelope<ReviewQualification>>(
    `${BASES.review}/${id}/competency-decision`,
    body
  )
  return toDetail(res.data)
}
