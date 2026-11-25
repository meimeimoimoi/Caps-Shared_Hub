import type { WorkStatus } from './types'

/**
 * One colour per case status, by who has to move next: orange answer the request, blue you are working, yellow the
 * client is answering, green delivered, red dispute. An overdue case is red whatever its status.
 */
export const STATUS_TONE: Record<WorkStatus, string> = {
  PENDING_EXPERT_RESPONSE: 'ep-status-accent',
  PAYMENT_CONFIRMED: 'ep-status-info',
  IN_REVIEW: 'ep-status-info',
  AWAITING_USER_INFORMATION: 'ep-status-paused',
  AWAITING_ACCEPTANCE: 'ep-status-ready',
  DISPUTED: 'ep-status-danger',
}

export const statusTone = (status: WorkStatus, overdue = false) =>
  overdue ? 'ep-status-danger' : STATUS_TONE[status]
