import type { CASE_STATUS } from '@/lib/constants'
import type { SettlementRule } from './settlement'

export type CaseStatus = keyof typeof CASE_STATUS
export type TaskCode = 'T1' | 'T2' | 'T3' | 'T4' | 'T5' | 'T6'
export type Actor = 'USER' | 'EXPERT' | 'SYSTEM' | 'ADMIN'

/** Reason a TERMINATED case stopped; kept apart from the settlement (BR-M12). */
export type TerminationReason = Extract<
  SettlementRule,
  'USER_NON_RESPONSE' | 'USER_CANCELLED' | 'EXPERT_ABANDON' | 'SYSTEM_ERROR'
>

/** Review package locked when the request is sent (BR-M05); newer User versions do not replace it. */
export interface ReviewPackage {
  version: string
  lockedAt: string
  aiDraft: string
  snapshot: string
  template: string
  citations: number
  documents: string[]
}

export interface Citation {
  ref: string
  note: string
}

export type ReviewResult =
  | {
      outcome: 'VERIFIED'
      /** Absent until the documents API can store the expert's revision */
      verifiedVersion?: string
      conclusion: string
      notes: Citation[]
      deliveredAt: string
    }
  | {
      outcome: 'CANNOT_VERIFY'
      summary: string
      rationale: string
      findings: Citation[]
      deliveredAt: string
    }

/** DELIVERY_ISSUE moves the case to DISPUTED; a USER_NON_RESPONSE challenge leaves it TERMINATED. */
export type DisputeKind = 'DELIVERY_ISSUE' | 'USER_NON_RESPONSE_CHALLENGE'

/** What the client gets back in each case, in VND (GET /review-cases/{id} → clientTerms; the expert gets null). */
export interface ClientTerms {
  latePenaltyHours: number
  lateCancelHours: number
  noResponseDays: number
  lateRefund: number
  noDeliveryRefund: number
  noResponseRefund: number
  /** Back if the client accepts the delivery as it stands: the late refund, or 0 */
  acceptRefund: number
  disputeRefund: number
}

/** What the expert receives in each case, in VND (GET /review-cases/{id} → expertTerms; the client gets null). */
export interface ExpertTerms {
  latePenaltyHours: number
  lateCancelHours: number
  noResponseDays: number
  payout: number
  latePayout: number
  noResponsePayout: number
}

export interface ReviewCase {
  id: string
  /** Short code shown for a real case, whose id is a UUID */
  code?: string
  /** Comes from the API; the demo's steps that the API does not have are hidden */
  live?: boolean
  clientTerms?: ClientTerms
  problemDescription?: string
  expectedOutcome?: string | null
  declineReason?: string
  /** The expert gave up the case after accepting it */
  expertWithdrew?: boolean
  title: string
  status: CaseStatus
  expert: { name: string; initials: string; color: string; role: string }
  serviceName: string
  slaDays: number
  amount: number
  requestedAt: string
  package?: ReviewPackage
  due?: {
    response?: string
    payment?: string
    start?: string
    delivery?: string
    /** Grace period after the delivery deadline, before EXPERT_ABANDON */
    grace?: string
    info?: string
    acceptance?: string
    /** Window to challenge a USER_NON_RESPONSE termination */
    challenge?: string
  }
  /** Flag on an IN_REVIEW case past its delivery deadline; not a status */
  overdue?: boolean
  termination?: TerminationReason
  tasks: TaskCode[] // các nhiệm vụ Expert đã hoàn thành
  infoRequest?: {
    message: string
    /** Fixture-only checklist; the API sends the question as one message */
    items?: string[]
    sentAt: string
    response?: string
  }
  result?: ReviewResult
  dispute?: {
    kind: DisputeKind
    issue?: IssueCode
    description: string
    openedAt: string
    /** Past the admin's decision deadline with no decision yet */
    decisionLate?: boolean
    decision?: {
      outcome: Extract<SettlementRule, `RESOLVE_${string}`>
      reason: string
      decidedBy: string
      decidedAt: string
    }
  }
  settlement?: {
    rule: SettlementRule
    settledAt: string
    ref: string
    /** Amounts settled by the backend; when present they replace the policy estimate */
    amounts?: SettlementAmounts
  }
  rating?: { stars: number; comment: string; at: string }
  timeline: { at: string; actor: Actor; event: TimelineEvent }[]
  updatedAt?: string
}

/** The viewer's own part of the final split, in VND: the client's refund or the expert's payout, the other null. */
export interface SettlementAmounts {
  clientRefund: number | null
  expertAmount: number | null
}

/** A question the expert asked and the client's answer (GET /review-cases/{id} → infoRequests). */
export interface InfoRequestDto {
  id: string
  message: string
  dueAt: string
  status: 'OPEN' | 'ANSWERED' | 'EXPIRED'
  response: string | null
  respondedAt: string | null
  createdAt: string
}

/** A complaint about a delivery (GET /review-cases/{id}/dispute). */
export interface DisputeDto {
  id: string
  reason: string
  description: string
  status: 'OPEN' | 'RESOLVED' | 'WITHDRAWN'
  openedAt: string
  decideBy: string
  expertStatement: string | null
  expertStatementAt: string | null
  /** The expert explains before then; the admin waits for it unless the statement came earlier */
  statementDueBy: string
  refundPct: number | null
  resolutionNote: string | null
  closedAt: string | null
}

/** An open dispute in the admin queue. */
export interface AdminDisputeDto {
  reviewCaseId: string
  /** Only admins see it; the expert never learns the client's contact. */
  requesterEmail: string | null
  expertProfileId: string
  fee: number
  platformFeePct: number
  result: string | null
  reviewSummary: string | null
  overdue: boolean
  dispute: DisputeDto
}

/** A file added to a case. */
export interface AttachmentDto {
  id: string
  fileName: string
  contentType: string
  sizeBytes: number
  uploadedBy: string
  uploadedAt: string
}

/** A review case as the workflow API returns it (ReviewCaseResponse). */
export interface ReviewCaseDto {
  id: string
  status: string
  result: 'VERIFIED' | 'CANNOT_VERIFY' | null
  reviewSummary: string | null
  cannotVerifyReason: string | null
  /** Legal basis the expert relied on, one reference per entry. */
  citations: string[]
  /** The AI draft under review (detail only; null for uploaded files). */
  sourceContent: Record<string, unknown> | null
  /** Name of the file the client uploaded for review; null for a draft written in the app */
  sourceFileName?: string | null
  /** The expert's edited copy of that draft, once delivered. */
  revisedContent: Record<string, unknown> | null
  declineReason: string | null
  documentId: string
  sourceVersionId: string
  expertProfileId: string
  requesterUserId: string
  serviceCode: string | null
  fee: number
  turnaroundHours: number
  problemDescription: string
  expectedOutcome: string | null
  paymentDeadline: string | null
  responseDeadline: string | null
  deliveryDeadline: string | null
  acceptanceDeadline: string | null
  /** When each step really happened; null until it does */
  paidAt: string | null
  acceptedAt: string | null
  deliveredAt: string | null
  rating: number | null
  ratingComment: string | null
  ratedAt: string | null
  /** Null while the case runs or when nothing was paid */
  settlement: SettlementAmounts | null
  /** Only GET /review-cases/{id} loads them; null in lists and action responses */
  infoRequests: InfoRequestDto[] | null
  /** The expert's extension request; null when never asked */
  extension?: ExtensionDto | null
  clientTerms?: ClientTerms | null
  expertTerms?: ExpertTerms | null
  updatedAt: string
  createdAt: string
}

export type TimelineEvent =
  | 'requested'
  | 'withdrawn'
  | 'declined'
  | 'responseTimeout'
  | 'accepted'
  | 'paymentExpired'
  | 'paid'
  | 'cancelled'
  | 'startTimeout'
  | 'started'
  | 'infoRequested'
  | 'infoAnswered'
  | 'overdue'
  | 'delivered'
  | 'userAccepted'
  | 'autoConfirmed'
  | 'disputed'
  | 'challenged'
  | 'resolved'
  | 'terminated'
  | 'settled'

// SLA_BREACH is no longer offered (the late rule refunds a late delivery); kept to label older disputes
export type IssueCode =
  | 'DELIVERABLE_INCOMPLETE'
  | 'SLA_BREACH'
  | 'OBLIGATION_NOT_MET'
  | 'PROFESSIONAL_JUDGMENT'

/** One message of the case chat between the client and the expert. */
export interface CaseChatMessage {
  id: string
  senderUserId: string
  senderRole: 'CLIENT' | 'EXPERT'
  content: string
  createdAt: string
}

/** Messages the signed-in user has not read yet in one case. */
export interface CaseUnread {
  reviewCaseId: string
  unreadCount: number
}

/** The expert asked for 1–2 more working days; decision is null while the client has not answered */
export interface ExtensionDto {
  days: number
  reason: string
  requestedAt: string
  decision: 'EXTENSION_ACCEPTED' | 'EXTENSION_DECLINED' | null
  decidedAt: string | null
}
