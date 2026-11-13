import { api } from '@/lib/api-client'
import { i18n } from '@/lib/i18n'
import { APPLICATION_STATUS } from '@/lib/constants'
import { isExpertDemo } from '@/lib/expert-data-source'
import { CURRENT_ADMIN, QUEUE_STATUSES, SYSTEM_ACTOR } from '../constants'
import type {
  ApplicationDetail,
  ApplicationStatus,
  EligibilityCheck,
  EligibilityDecisionInput,
  EligibilityResult,
  Expert,
  ExpertApplication,
  CriterionDeclaration,
  InformationRounds,
  ReviewClaimState,
  Submission,
} from '../types'

/* Demo mode reads fixtures (a copy, so React Query sees new data);
 * demo mutations edit the fixtures so the next refetch sees the change. */
const fixtures = () => import('./fixtures')
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
    sourceUrl?: string | null
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
    /** Made by the system itself (e.g. registering the only service after Gate 1) */
    bySystem?: boolean
  }[]
  eligibility: EligibilityCheck[]
  minYearsExperience: number
  suggestedExperienceResult: EligibilityResult
  canDecide: boolean
  /** Every submission, first one first, with the statements agreed to (details above come from the latest) */
  submissions?: Submission[]
  notApplicableCriteria?: string[]
  criterionDeclarations?: CriterionDeclaration[]
  declarationPassedCriteria?: string[]
  claim?: ReviewClaimState
  rounds?: InformationRounds
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
      name: e.sourceUrl || e.fileName,
      sourceUrl: e.sourceUrl,
      pages: [],
      evidenceId: e.id,
      uploadedAt: e.uploadedAt,
    })),
    // Empty actor = a reviewer; the history tab shows a generic label
    history: a.history.map((h) => {
      const label = APPLICATION_STATUS[h.toStatus]?.label ?? h.toStatus
      return {
        at: h.at,
        actor: h.bySystem ? SYSTEM_ACTOR : h.byApplicant ? name : '',
        // A status name is a label, not a sentence: no trailing full stop
        text: h.note ? `${label}: ${h.note}` : label,
      }
    }),
    eligibility: a.eligibility,
    minYearsExperience: a.minYearsExperience,
    suggestedExperienceResult: a.suggestedExperienceResult,
    canDecide: a.canDecide,
    submissions: a.submissions ?? [],
    notApplicableCriteria: a.notApplicableCriteria ?? [],
    criterionDeclarations: a.criterionDeclarations ?? [],
    declarationPassedCriteria: a.declarationPassedCriteria ?? [],
    decidedAt: a.decidedAt,
    decisionNote: a.decisionNote,
    earliestReapplyAt: a.earliestReapplyAt,
    claim: a.claim,
    rounds: a.rounds,
  }
}

/* ── Expert vetting (Gate 1) ── */
export async function getApplications(
  signal?: AbortSignal,
  statuses: readonly ApplicationStatus[] = QUEUE_STATUSES
) {
  // The API lists one status per request; the queue tabs need all of them
  const lists = await Promise.all(
    statuses.map((status) =>
      api.get<Envelope<ReviewQueueItem[]>>(REVIEW_BASE, {
        params: { status },
        signal,
      })
    )
  )
  return lists.flatMap((l) => l.data.map(toQueueRow))
}

/** The API turns missing or inaccessible applications into an ApiError. */
export async function getApplicationDetail(
  id: string,
  signal?: AbortSignal
): Promise<ApplicationDetail | null> {
  const res = await api.get<Envelope<ReviewApplication>>(
    `${REVIEW_BASE}/${id}`,
    { signal }
  )
  return toDetail(res.data)
}

/** File content of one uploaded document from the review API. */
export async function getEvidenceFile(id: string, evidenceId: string) {
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
  const res = await api.post<Envelope<ReviewApplication>>(
    `${REVIEW_BASE}/${id}/eligibility-decision`,
    body
  )
  return toDetail(res.data)
}

/** Takes the application from the shared queue; REVIEW_CLAIMED when another reviewer won */
export async function claimApplication(id: string): Promise<ApplicationDetail> {
  const res = await api.post<Envelope<ReviewApplication>>(`${REVIEW_BASE}/${id}/claim`)
  return toDetail(res.data)
}

/** Gives the application back to the shared queue */
export async function releaseApplication(id: string): Promise<ApplicationDetail> {
  const res = await api.post<Envelope<ReviewApplication>>(`${REVIEW_BASE}/${id}/release`)
  return toDetail(res.data)
}

/* ── Expert management: one row per Expert–Service past final approval ── */
const MANAGED = '/api/v1/admin/experts/managed'
const SERVICE_ACCESS = (id: string) => `/api/v1/admin/experts/approvals/${id}/service-access`

interface ManagedExpert {
  id: string
  applicationId: string
  displayName: string | null
  email: string | null
  yearsExperience: number | null
  fields: string[]
  serviceName: string
  status: 'APPROVED_FOR_SERVICE' | 'SUSPENDED'
  acceptingRequests: boolean
  fee: number | null
  capacity: number
  activeCases: number
  approvedAt: string | null
  competencyReviewer: string | null
  history: { actor: string; fromStatus: string | null; toStatus: string; note: string | null; at: string }[]
}

/** Approved services count as active only when the Marketplace can list them (priced, accepting, capacity) */
const serviceStatusOf = (m: ManagedExpert): Expert['serviceStatus'] =>
  m.status === 'SUSPENDED'
    ? 'SUSPENDED'
    : m.fee !== null && m.acceptingRequests && m.capacity > 0
      ? 'ACTIVE'
      : 'INACTIVE'

/* Status a qualification moved to → wording of that step in the drawer history */
const HISTORY_KEYS = {
  PREPARING: 'registered',
  COMPETENCY_REVIEW: 'submitted',
  NEED_MORE_INFORMATION: 'moreInfo',
  PENDING_FINAL_APPROVAL: 'passed',
  APPROVED_FOR_SERVICE: 'approved',
  SUSPENDED: 'suspended',
} as const

const historyText = (h: ManagedExpert['history'][number]) => {
  const key =
    h.fromStatus === 'SUSPENDED' && h.toStatus === 'APPROVED_FOR_SERVICE'
      ? 'reinstated'
      : (HISTORY_KEYS[h.toStatus as keyof typeof HISTORY_KEYS] ?? 'changed')
  const text = i18n.t(`experts.historyText.${key}`, { ns: 'admin', status: h.toStatus })
  return h.note ? `${text} ${i18n.t('experts.historyText.note', { ns: 'admin', note: h.note })}` : text
}

/** SYSTEM and ADMIN are placeholders from the API for actors without a name */
const historyActor = (actor: string) =>
  actor === 'SYSTEM' || actor === 'ADMIN'
    ? i18n.t(`experts.actor.${actor === 'SYSTEM' ? 'system' : 'admin'}`, { ns: 'admin' })
    : actor

const toExpert = (m: ManagedExpert): Expert => ({
  id: m.id,
  applicationId: m.applicationId,
  name: m.displayName ?? m.email ?? m.id,
  email: m.email ?? '',
  fields: m.fields,
  serviceName: m.serviceName,
  serviceStatus: serviceStatusOf(m),
  fee: m.fee,
  activeCases: m.activeCases,
  capacity: m.capacity,
  approvedAt: m.approvedAt ?? '',
  experienceYears: m.yearsExperience ?? 0,
  schedule: i18n.t(m.acceptingRequests ? 'experts.accepting.on' : 'experts.accepting.off', { ns: 'admin' }),
  reviewer: m.competencyReviewer ?? '—',
  history: m.history.map((h) => ({ at: h.at, actor: historyActor(h.actor), text: historyText(h) })),
})

export async function getExperts(signal?: AbortSignal) {
  if (isExpertDemo) return structuredClone((await fixtures()).mockExperts)
  const res = await api.get<Envelope<ManagedExpert[]>>(MANAGED, { signal })
  return res.data.map(toExpert)
}

/** Suspends (note required) or reinstates one Expert–Service; other services of the expert are untouched */
export async function setExpertServiceStatus(
  id: string,
  status: Expert['serviceStatus'],
  note?: string
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
  await api.post(SERVICE_ACCESS(id), {
    action: status === 'SUSPENDED' ? 'SUSPEND' : 'REINSTATE',
    note: note?.trim() || null,
  })
}
