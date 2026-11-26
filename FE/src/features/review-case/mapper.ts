import { i18n } from '@/lib/i18n'
import type { SettlementRule } from './settlement'
import type {
  Actor,
  CaseStatus,
  DisputeDto,
  IssueCode,
  ReviewCase,
  ReviewCaseDto,
  TimelineEvent,
} from './types'

// Server statuses the case page names differently; the rest are shared
const STATUS: Record<string, CaseStatus> = {
  EXPERT_DECLINED: 'DECLINED_BY_EXPERT',
  EXPERT_TIMEOUT: 'EXPERT_RESPONSE_TIMEOUT',
  AUTO_CONFIRMED: 'COMPLETED',
  DELIVERY_OVERDUE: 'TERMINATED',
}

// ponytail: only the last step is known (the API has no status history); expose it if the full log is needed
const LAST_EVENT: Record<string, [Actor, TimelineEvent]> = {
  PENDING_EXPERT_RESPONSE: ['USER', 'paid'],
  IN_REVIEW: ['EXPERT', 'accepted'],
  AWAITING_ACCEPTANCE: ['EXPERT', 'delivered'],
  COMPLETED: ['USER', 'userAccepted'],
  AUTO_CONFIRMED: ['SYSTEM', 'autoConfirmed'],
  DISPUTED: ['USER', 'disputed'],
  RESOLVED: ['ADMIN', 'resolved'],
  EXPERT_DECLINED: ['EXPERT', 'declined'],
  EXPERT_TIMEOUT: ['SYSTEM', 'responseTimeout'],
  WITHDRAWN: ['USER', 'withdrawn'],
  CANCELLED_UNPAID: ['SYSTEM', 'paymentExpired'],
  TERMINATED: ['SYSTEM', 'terminated'],
  DELIVERY_OVERDUE: ['SYSTEM', 'terminated'],
}

export const caseCode = (id: string) => `RC-${id.slice(-8).toUpperCase()}`

/** The client's description is the only title a case has until the documents API exists. */
export function caseTitle(problem: string) {
  const line = problem.trim().split('\n')[0]
  return line.length > 90 ? `${line.slice(0, 90)}…` : line
}

export const outcomeOf = (refundPct: number | null) =>
  refundPct === 100
    ? 'RESOLVE_REFUND_USER'
    : refundPct === 0
      ? 'RESOLVE_PAY_EXPERT'
      : 'RESOLVE_PARTIAL'

function ruleOf(d: ReviewCaseDto, dispute?: DisputeDto | null): SettlementRule {
  switch (d.status) {
    case 'COMPLETED':
    case 'AUTO_CONFIRMED':
      // Only a late delivery refunds part of an accepted case
      if ((d.settlement?.clientRefund ?? 0) > 0) return 'LATE_DELIVERY'
      return d.status === 'COMPLETED' ? 'USER_ACCEPTED' : 'AUTO_CONFIRMED'
    case 'RESOLVED':
      return outcomeOf(dispute?.refundPct ?? null)
    case 'TERMINATED':
      return 'USER_NON_RESPONSE'
    case 'DELIVERY_OVERDUE':
      return 'EXPERT_ABANDON'
    default:
      return 'FULL_REFUND'
  }
}

function timelineOf(d: ReviewCaseDto): ReviewCase['timeline'] {
  const asked = d.infoRequests ?? []
  const entries: ReviewCase['timeline'] = [
    { at: d.createdAt, actor: 'USER', event: 'requested' },
  ]
  if (d.paidAt) entries.push({ at: d.paidAt, actor: 'USER', event: 'paid' })
  if (d.acceptedAt)
    entries.push({ at: d.acceptedAt, actor: 'EXPERT', event: 'accepted' })
  for (const q of asked) {
    entries.push({ at: q.createdAt, actor: 'EXPERT', event: 'infoRequested' })
    if (q.respondedAt)
      entries.push({ at: q.respondedAt, actor: 'USER', event: 'infoAnswered' })
  }
  if (d.deliveredAt)
    entries.push({ at: d.deliveredAt, actor: 'EXPERT', event: 'delivered' })
  // The step that ended the case has no time of its own: the last update is it
  const last = LAST_EVENT[d.status]
  if (last && !entries.some((e) => e.event === last[1]))
    entries.push({ at: d.updatedAt, actor: last[0], event: last[1] })
  return entries.sort((a, b) => b.at.localeCompare(a.at))
}

function resultOf(d: ReviewCaseDto): ReviewCase['result'] {
  if (!d.result) return undefined
  const deliveredAt = d.deliveredAt ?? d.updatedAt
  const cites = (d.citations ?? []).map((ref) => ({ ref, note: '' }))
  return d.result === 'VERIFIED'
    ? {
        outcome: 'VERIFIED',
        conclusion: d.reviewSummary ?? '',
        notes: cites,
        deliveredAt,
      }
    : {
        outcome: 'CANNOT_VERIFY',
        summary: d.reviewSummary ?? '',
        rationale: d.cannotVerifyReason ?? '',
        findings: cites,
        deliveredAt,
      }
}

function disputeOf(dispute?: DisputeDto | null): ReviewCase['dispute'] {
  if (!dispute) return undefined
  return {
    kind: 'DELIVERY_ISSUE',
    issue: dispute.reason as IssueCode,
    description: dispute.description,
    openedAt: dispute.openedAt,
    decisionLate:
      dispute.status === 'OPEN' && new Date(dispute.decideBy).getTime() < Date.now(),
    decideBy: dispute.decideBy,
    extended: dispute.extended,
    decision:
      dispute.status === 'RESOLVED' && dispute.closedAt
        ? {
            outcome: outcomeOf(dispute.refundPct),
            reason: dispute.resolutionNote ?? '',
            decidedBy: '',
            decidedAt: dispute.closedAt,
          }
        : undefined,
  }
}

/** Turns the API's case into the shape the case page renders. */
export function toReviewCase(
  d: ReviewCaseDto,
  extras: {
    expertName?: string
    serviceName?: string
    dispute?: DisputeDto | null
  } = {}
): ReviewCase {
  const status = STATUS[d.status] ?? (d.status as CaseStatus)
  const open = d.infoRequests?.find((q) => q.status === 'OPEN')
  const answered = d.infoRequests?.findLast((q) => q.response)
  const code = caseCode(d.id)
  return {
    id: d.id,
    code,
    live: true,
    clientTerms: d.clientTerms ?? undefined,
    title: caseTitle(d.problemDescription),
    status,
    expert: {
      name: extras.expertName ?? i18n.t('live.theExpert', { ns: 'reviewCase' }),
      initials: '',
      color: '',
      role: '',
    },
    serviceName: extras.serviceName ?? d.serviceCode ?? '',
    slaDays: Math.ceil(d.turnaroundHours / 24),
    amount: d.fee,
    requestedAt: d.createdAt,
    problemDescription: d.problemDescription,
    expectedOutcome: d.expectedOutcome,
    // Set only by an expert's own words: EXPERT_FULL and SERVICE_SUSPENDED are system codes
    declineReason:
      d.declineReason && !/^[A-Z_]+$/.test(d.declineReason)
        ? d.declineReason
        : undefined,
    // A decline before accepting has no delivery deadline; one after it is the expert withdrawing
    expertWithdrew: d.status === 'EXPERT_DECLINED' && !!d.deliveryDeadline,
    due: {
      payment:
        d.status === 'AWAITING_PAYMENT'
          ? (d.paymentDeadline ?? undefined)
          : undefined,
      response:
        d.status === 'PENDING_EXPERT_RESPONSE'
          ? (d.responseDeadline ?? undefined)
          : undefined,
      delivery:
        d.status === 'IN_REVIEW'
          ? (d.deliveryDeadline ?? undefined)
          : undefined,
      info: open?.dueAt,
      acceptance:
        d.status === 'AWAITING_ACCEPTANCE'
          ? (d.acceptanceDeadline ?? undefined)
          : undefined,
    },
    termination:
      d.status === 'DELIVERY_OVERDUE'
        ? 'EXPERT_ABANDON'
        : d.status === 'TERMINATED'
          ? 'USER_NON_RESPONSE'
          : undefined,
    tasks: [],
    infoRequest:
      open || answered
        ? {
            message: (open ?? answered)!.message,
            sentAt: (open ?? answered)!.createdAt,
            response: open ? undefined : (answered?.response ?? undefined),
          }
        : undefined,
    result: resultOf(d),
    dispute: disputeOf(extras.dispute),
    settlement: d.settlement
      ? {
          rule: ruleOf(d, extras.dispute),
          settledAt: d.updatedAt,
          ref: code,
          amounts: d.settlement,
        }
      : undefined,
    rating:
      d.rating != null
        ? { stars: d.rating, comment: d.ratingComment ?? '', at: d.ratedAt ?? d.updatedAt }
        : undefined,
    timeline: timelineOf(d),
    updatedAt: d.updatedAt,
  }
}
