import type { DashboardDto, WorkItem } from './types.ts'

export const statusLabels: Record<WorkItem['status'], string> = {
  PENDING_EXPERT_RESPONSE: 'Response needed', PAYMENT_CONFIRMED: 'Ready to start',
  IN_REVIEW: 'In review', AWAITING_USER_INFORMATION: 'Waiting for information',
  AWAITING_ACCEPTANCE: 'Awaiting acceptance', DISPUTED: 'Dispute response',
}

export const activityTypeLabels: Record<string, string> = {
  case_created: 'New case', case_completed: 'Case completed', payment_received: 'Payment received',
  review_submitted: 'Review submitted', status_changed: 'Status changed',
  deadline_extended: 'Deadline extended', dispute_opened: 'Dispute opened', pricing_approved: 'Pricing approved',
}

export const activityTypeIcons: Record<string, string> = {
  case_created: '📋', case_completed: '✅', payment_received: '💰',
  review_submitted: '📝', status_changed: '🔄', deadline_extended: '⏰',
  dispute_opened: '⚠️', pricing_approved: '✓',
}

export function toDashboardViewModel(dto: DashboardDto, contextVersion: string) {
  const consistent = dto.contextVersion === contextVersion
  const queue = dto.queue.status === 'available'
    ? { ...dto.queue, data: { ...dto.queue.data, items: dto.queue.data.items.toSorted((a, b) => a.priority - b.priority) } }
    : dto.queue
  return { ...dto, queue, consistent }
}

// Only recognized actions resolve to the registered case detail route.
export function resolveActionRoute(code: string, id: string): string | null {
  return ['OPEN_CASE', 'VIEW_DELIVERY'].includes(code) ? `/expert/cases/${encodeURIComponent(id)}` : null
}

export function formatDeadline(at: string | null, timezone: string) {
  if (!at) return 'No deadline supplied'
  const date = new Date(at)
  if (Number.isNaN(date.getTime())) return 'Deadline unavailable'
  try {
    return new Intl.DateTimeFormat('en-GB', { timeZone: timezone, day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(date)
  } catch {
    return 'Deadline timezone unavailable'
  }
}

export function formatRelativeTime(timestamp: string): string {
  const now = Date.now()
  const then = new Date(timestamp).getTime()
  if (Number.isNaN(then)) return ''
  const diffMs = now - then
  const minutes = Math.floor(diffMs / 60_000)
  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short' }).format(new Date(timestamp))
}
