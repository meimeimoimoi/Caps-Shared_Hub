import type { CASE_STATUS } from '@/lib/constants'
import type { SettlementRule } from './settlement'

export type CaseStatus = keyof typeof CASE_STATUS
export type TaskCode = 'T1' | 'T2' | 'T3' | 'T4' | 'T5' | 'T6'
export type Actor = 'USER' | 'EXPERT' | 'SYSTEM' | 'ADMIN'

/** Gói hồ sơ khóa tại thời điểm Expert ACCEPT; version mới của User không thay thế. */
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

export interface ReviewCase {
  id: string
  title: string
  status: CaseStatus
  expert: { name: string; initials: string; color: string; role: string }
  serviceName: string
  slaDays: number
  amount: number
  requestedAt: string
  /** Có sau khi Expert ACCEPT */
  package?: ReviewPackage
  due?: {
    payment?: string
    start?: string
    delivery?: string
    info?: string
    acceptance?: string
  }
  tasks: TaskCode[] // các nhiệm vụ Expert đã hoàn thành
  infoRequest?: {
    message: string
    items: string[]
    sentAt: string
    response?: string
  }
  result?: ReviewResult
  dispute?: {
    issue: IssueCode
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
  | 'declined'
  | 'accepted'
  | 'paymentExpired'
  | 'paid'
  | 'startTimeout'
  | 'started'
  | 'infoRequested'
  | 'infoAnswered'
  | 'delivered'
  | 'userAccepted'
  | 'autoConfirmed'
  | 'disputed'
  | 'resolved'
  | 'terminated'

export type IssueCode =
  | 'DELIVERABLE_INCOMPLETE'
  | 'SLA_BREACH'
  | 'OBLIGATION_NOT_MET'
  | 'PROFESSIONAL_JUDGMENT'
