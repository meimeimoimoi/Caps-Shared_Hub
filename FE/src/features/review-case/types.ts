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
      verifiedVersion: string
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

export interface ReviewCase {
  id: string
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
    items: string[]
    sentAt: string
    response?: string
  }
  result?: ReviewResult
  dispute?: {
    kind: DisputeKind
    issue?: IssueCode
    description: string
    openedAt: string
    decision?: {
      outcome: Extract<SettlementRule, `RESOLVE_${string}`>
      reason: string
      decidedBy: string
      decidedAt: string
    }
  }
  settlement?: { rule: SettlementRule; settledAt: string; ref: string }
  rating?: { stars: number; comment: string; at: string }
  timeline: { at: string; actor: Actor; event: TimelineEvent }[]
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
