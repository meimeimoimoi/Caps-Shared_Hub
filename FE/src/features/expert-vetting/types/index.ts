import type {
  APPLICATION_STATUS,
  QUALIFICATION_STATUS,
  SERVICE_STATUS,
} from '@/lib/constants'

export type ApplicationStatus = keyof typeof APPLICATION_STATUS

export interface ExpertApplication {
  id: string
  name: string
  /** Not returned by the review API; the table shows the fields instead */
  email?: string
  years: number
  aiFlags: number
  submittedAt: string
  status: ApplicationStatus
  /** Field codes, e.g. CORPORATE_INCOME_TAX */
  fields?: string[]
  /** Follows an earlier closed application (BR-E23) */
  isReapplication?: boolean
}

export interface AiFlag {
  id: string
  document: string // mã tài liệu liên quan, vd. EV-03
  documentName: string
  /** Gợi ý nội dung yêu cầu bổ sung cho mục này */
  request: string
  title: string
  detail: string
}

export interface LegalCheck {
  item: string
  result: 'declared' | 'present' | 'review'
  note: string
  document?: string
}

export interface Criterion {
  id: string
  name: string
  description: string
}

export interface PageNote {
  kind: 'cite' | 'ai' | 'edit'
  label: string
  text: string
  /** Gắn với cờ AI → nút "Đánh dấu đã xem xét" dùng chung state với tab AI sàng lọc */
  flagId?: string
}

export interface DocumentPage {
  title?: string
  paragraphs: string[]
  notes: PageNote[]
}

export interface ApplicationDocument {
  code: string // CV, EV-01, ...
  name: string
  pages: DocumentPage[]
  /** Uploaded file on the server; opened through the review API */
  evidenceId?: string
  sourceUrl?: string | null
  /** When the file or link was added; places it in the submission that sent it (S19 Step 2) */
  uploadedAt?: string
}

export interface ApplicationDetail extends ExpertApplication {
  birthDate: string
  jobTitle: string
  company: string
  location: string
  bio: string
  fields: string[]
  highlights: string
  /** Demo only: AI screening is postponed, the review API does not return it */
  screening?: {
    ranAt: string
    rerunAt?: string
    checkedCount: number
    flags: AiFlag[]
    legalChecks: LegalCheck[]
  }
  documents: ApplicationDocument[]
  history: HistoryEntry[]
  /** Per-requirement results of the latest Gate 1 decision (empty before the first one) */
  eligibility: EligibilityCheck[]
  minYearsExperience: number
  /** EV-06 result the declared years point to; the reviewer confirms it */
  suggestedExperienceResult: EligibilityResult
  /** True while the application waits for a Gate 1 decision */
  canDecide: boolean
  /** Every submission, first one first, with the statements agreed to; empty in demo data */
  submissions?: Submission[]
  /** Criteria the reviewer may mark NOT_APPLICABLE (with a reason); empty in demo data */
  notApplicableCriteria?: string[]
  /** Statements of the latest submission under each criterion they support (EV-04, EV-05) */
  criterionDeclarations?: CriterionDeclaration[]
  /** Criteria passed by an agreed statement (EV-04, EV-05); the server records PASS, the reviewer does not judge them */
  declarationPassedCriteria?: string[]
  decidedAt: string | null
  decisionNote: string | null
  earliestReapplyAt: string | null
  /** Who works on the review now; decisions need an active claim (absent in older responses) */
  claim?: ReviewClaimState
  /** Rounds of more information asked for so far and the policy limit */
  rounds?: InformationRounds
}

/** Rounds of "more information needed" used and the policy limit; on the last round it cannot be chosen */
export interface InformationRounds {
  used: number
  max: number
  canRequestMore: boolean
}

/** What the expert sent for one competency: a short description and the files tied to it */
export interface CompetencySubmission {
  code: string
  description: string | null
  evidenceIds: string[]
}

/** The reviewer working on a review now; expiresAt comes from the server clock, never the browser's */
export interface ReviewClaim {
  holderUserId: string
  holderEmail: string | null
  claimedAt: string
  /** Null while the review waits for the expert (the hold does not run) */
  expiresAt: string | null
  heldByMe: boolean
}

/** One change of a review's claim: CLAIM with a previous holder means that holder's claim had expired */
export interface ReviewClaimEvent {
  action: 'CLAIM' | 'RELEASE' | 'REASSIGN'
  actorUserId: string
  actorEmail: string | null
  holderUserId: string | null
  holderEmail: string | null
  previousHolderUserId: string | null
  previousHolderEmail: string | null
  reason: string | null
  at: string
}

export interface ReviewClaimState {
  /** Null when nobody holds the review (never claimed, released, decided or expired) */
  current: ReviewClaim | null
  /** True while the review waits for a decision and the caller may take it */
  canClaim: boolean
  history: ReviewClaimEvent[]
}

/** One submission (first submit or supplement) and the statements the applicant agreed to */
export interface Submission {
  number: number
  submittedAt: string
  declarations: { code: string; language: string; text: string }[]
}

/** A statement the applicant agreed to, shown under the criterion it supports */
export interface CriterionDeclaration {
  criterion: string
  code: string
  language: string
  text: string
  agreedAt: string
  agreedByUserId: string
}

/* Gate 1 (eligibility) is decided per expert from EV-01…EV-06; the outcome is derived from the results.
 * NOT_APPLICABLE is allowed only on the criteria the policy lists and counts as PASS */
export type EligibilityResult =
  | 'PASS'
  | 'FAIL'
  | 'NEED_MORE_INFORMATION'
  | 'NOT_APPLICABLE'
export type EligibilityOutcome =
  'ELIGIBLE' | 'NOT_ELIGIBLE' | 'NEED_MORE_INFORMATION'

export interface EligibilityCheck {
  code: string
  result: EligibilityResult
  note: string | null
  decidedAt: string
  /** EV-06 minimum years in force when decided; null for older decisions */
  appliedMinYearsExperience?: number | null
}

/** One requirement in the reviewer's form; result is empty until chosen */
export interface EligibilityAssessment {
  code: string
  result: EligibilityResult | ''
  note: string
}

export interface EligibilityDecisionInput {
  criteria: { code: string; result: EligibilityResult; note: string | null }[]
  note: string | null
}

/* Gate 2 (competency) is decided per Expert-Service from C1…C5; the outcome is derived from the results */
export type QualificationStatus = keyof typeof QUALIFICATION_STATUS
/** Gate 2 reviewers and System Admins (final approval) read qualifications through separate APIs */
export type QualificationScope = 'review' | 'approval'
export type FinalApprovalDecision = 'APPROVE' | 'RETURN_FOR_REVIEW'
export type ServiceAccessAction = 'SUSPEND' | 'REINSTATE'
export type CompetencyResult = 'PASS' | 'FAIL' | 'NEED_MORE_INFORMATION'
export type CompetencyOutcome =
  | 'PENDING_FINAL_APPROVAL'
  | 'NEED_MORE_INFORMATION'
  | 'FAIL'

/** One qualification in the Gate 2 queue */
export interface QualificationRow {
  id: string
  name: string
  years: number
  fields: string[]
  serviceCode: string
  /** Catalog name; the queue falls back to the code when the service is no longer active */
  serviceName?: string
  status: QualificationStatus
  submittedAt: string
  /** Follows an earlier FAIL for the same service (BR-E23) */
  isReapplication: boolean
}

/** One competency in the latest Gate 2 decision */
export interface CompetencyCheck {
  code: string
  result: CompetencyResult
  note: string
  evidenceIds: string[]
  decidedAt: string
}

export interface QualificationDetail {
  id: string
  serviceCode: string
  serviceName: string
  status: QualificationStatus
  submittedAt: string
  decidedAt: string | null
  decisionNote: string | null
  earliestReapplyAt: string | null
  previousQualificationId: string | null
  /** The expert as Gate 1 saw them, with the Gate 1 results; reuses the application tabs */
  profile: ApplicationDetail
  history: HistoryEntry[]
  competencies: CompetencyCheck[]
  /** True while the qualification waits for a Gate 2 decision */
  canDecide: boolean
  /** Who passed Gate 2; they cannot give the final approval (BR-E33) */
  competencyReviewerUserId: string | null
  /** True while the qualification waits for the System Admin final approval */
  canFinalApprove: boolean
  /** Approved: a System Admin can suspend the service */
  canSuspend: boolean
  /** Suspended: a System Admin can reinstate the service */
  canReinstate: boolean
  /** Who works on the Gate 2 review now; decisions need an active claim */
  claim?: ReviewClaimState
  /** Per competency: the expert's description and the files tied to it */
  submitted: CompetencySubmission[]
  rounds?: InformationRounds
}

export interface FinalApprovalInput {
  decision: FinalApprovalDecision
  note: string | null
}

/** One competency in the reviewer's form; result is empty until chosen */
export interface CompetencyAssessment {
  code: string
  result: CompetencyResult | ''
  note: string
  evidenceIds: string[]
}

export interface CompetencyDecisionInput {
  competencies: {
    code: string
    result: CompetencyResult
    note: string
    evidenceIds: string[]
  }[]
  note: string | null
}

/** actor = 'AI' cho thao tác của hệ thống AI, còn lại là tên người */
export interface HistoryEntry {
  at: string
  actor: string
  text: string
}

export interface Expert {
  id: string
  name: string
  email: string
  fields: string[]
  serviceStatus: keyof typeof SERVICE_STATUS
  /** Phí rà soát (VND); null = chưa thiết lập dịch vụ */
  fee: number | null
  activeCases: number
  capacity: number
  approvedAt: string
  experienceYears: number
  /** Lịch nhận việc, vd. "Thứ 2 – Thứ 6" */
  schedule: string
  reviewer: string
  /** text viết tiếp sau tên actor, vd. actor "Trần An" + text "duyệt đơn đăng ký." */
  history: HistoryEntry[]
}
