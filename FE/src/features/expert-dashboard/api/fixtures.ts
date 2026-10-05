import type { DashboardDto, WorkItem, ActivityEvent, DashboardNotification } from '../types'

export function createDashboardFixture(scenario: string): DashboardDto {
  const now = Date.now()
  const at = (hours: number) => new Date(now + hours * 3_600_000).toISOString()
  const ago = (hours: number) => new Date(now - hours * 3_600_000).toISOString()
  const daily = Array.from({ length: 28 }, (_, index) => ({
    date: new Date(now - (27 - index) * 86_400_000).toISOString(),
    received: scenario === 'empty' ? 0 : [3, 4, 2, 5, 3, 1, 2, 4, 5, 3, 4, 2, 1, 3, 5, 3, 4, 6, 3, 2, 3, 5, 4, 6, 3, 5, 2, 4][index],
    completed: scenario === 'empty' ? 0 : [2, 2, 3, 3, 2, 1, 1, 3, 3, 2, 4, 2, 1, 2, 4, 3, 3, 4, 2, 2, 2, 4, 3, 5, 3, 4, 2, 3][index],
  }))
  const item = (id: string, title: string, status: WorkItem['status'], hours: number, kind: string, priority: number, actor: 'EXPERT' | 'USER' = 'EXPERT', paused = false): WorkItem => ({
    id, title, status, serviceName: 'CIT draft verification', priority,
    deadline: { kind, at: at(hours), actor, paused, overdue: hours < 0 && !paused && actor === 'EXPERT' },
    nextAction: { code: status === 'AWAITING_ACCEPTANCE' ? 'VIEW_DELIVERY' : 'OPEN_CASE', label: status === 'PENDING_EXPERT_RESPONSE' ? 'Review request' : status === 'PAYMENT_CONFIRMED' ? 'Start review' : actor === 'USER' ? 'Wait for user response' : 'Open case', actor },
  })
  const items = [
    item('RC-1042', 'Annual CIT return · FY 2025', 'IN_REVIEW', -2, 'Delivery due', 0),
    item('RQ-1086', 'Deductible expense assessment', 'PENDING_EXPERT_RESPONSE', 3, 'Expert response due', 1),
    item('RC-1058', 'Related-party transaction review', 'PAYMENT_CONFIRMED', 8, 'Review start due', 2),
    item('RC-1037', 'Tax incentive eligibility', 'AWAITING_USER_INFORMATION', 27, 'User information due', 3, 'USER', true),
    item('RC-1029', 'CIT reconciliation statement', 'AWAITING_ACCEPTANCE', 42, 'User acceptance due', 4, 'USER'),
  ]

  const activityEvents: ActivityEvent[] = scenario === 'empty' ? [] : [
    { id: 'evt-1', type: 'payment_received', title: 'Payment confirmed for RC-1058', description: 'Client has confirmed payment for "Related-party transaction review". Case is ready to start.', timestamp: ago(0.5), caseId: 'RC-1058', actor: 'System' },
    { id: 'evt-2', type: 'review_submitted', title: 'Review delivered for RC-1025', description: 'Your review for "CIT quarterly estimate" has been delivered and is awaiting client acceptance.', timestamp: ago(2), caseId: 'RC-1025', actor: 'You' },
    { id: 'evt-3', type: 'case_completed', title: 'RC-1019 completed', description: 'Client accepted your review for "Transfer pricing documentation". Case is now closed.', timestamp: ago(6), caseId: 'RC-1019', actor: 'Client' },
    { id: 'evt-4', type: 'status_changed', title: 'RC-1037 paused', description: 'Delivery SLA paused while waiting for additional documents from client.', timestamp: ago(10), caseId: 'RC-1037', actor: 'System' },
    { id: 'evt-5', type: 'case_created', title: 'New case RQ-1086 assigned', description: 'You have been assigned a new review request for "Deductible expense assessment".', timestamp: ago(18), caseId: 'RQ-1086', actor: 'System' },
    { id: 'evt-6', type: 'pricing_approved', title: 'Pricing PR-004 approved', description: 'Your new pricing version PR-004 for "CIT draft verification" has been approved by admin.', timestamp: ago(26), caseId: null, actor: 'Admin' },
    { id: 'evt-7', type: 'deadline_extended', title: 'Deadline extended for RC-1042', description: 'Delivery deadline has been extended by 24 hours due to complexity assessment.', timestamp: ago(48), caseId: 'RC-1042', actor: 'System' },
    { id: 'evt-8', type: 'dispute_opened', title: 'Dispute raised on RC-1015', description: 'Client has opened a dispute regarding the scope of review for "Tax loss carryforward".', timestamp: ago(72), caseId: 'RC-1015', actor: 'Client' },
  ]

  const notifications: DashboardNotification[] = scenario === 'empty' ? [] : [
    { id: 'notif-1', severity: 'urgent', title: 'Overdue delivery', message: 'RC-1042 "Annual CIT return · FY 2025" delivery is 2 hours past the deadline.', timestamp: ago(0.1), read: false, actionUrl: null },
    { id: 'notif-2', severity: 'warning', title: 'Response deadline approaching', message: 'RQ-1086 requires your response within 3 hours.', timestamp: ago(0.3), read: false, actionUrl: null },
    { id: 'notif-3', severity: 'success', title: 'Payment received', message: 'Payment for RC-1058 has been confirmed. You can start the review.', timestamp: ago(0.5), read: false, actionUrl: null },
    { id: 'notif-4', severity: 'info', title: 'Pricing update approved', message: 'Your pricing version PR-004 is now effective.', timestamp: ago(26), read: true, actionUrl: null },
    { id: 'notif-5', severity: 'info', title: 'System maintenance', message: 'Scheduled maintenance window: Oct 5, 2026 02:00-04:00 (ICT).', timestamp: ago(48), read: true, actionUrl: null },
  ]

  return {
    generatedAt: at(scenario === 'stale' ? -1 : 0), contextVersion: scenario === 'inconsistent' ? 'demo-v0' : 'demo-v1', timezone: 'Asia/Ho_Chi_Minh',
    freshness: { stale: scenario === 'stale', message: scenario === 'stale' ? 'The read projection is delayed. These are the last available values.' : null },
    queue: scenario === 'partial' ? { status: 'error', message: 'Work queue is temporarily unavailable. Counts and service readiness are still available.' } : { status: 'available', data: { items: scenario === 'empty' ? [] : items, total: scenario === 'empty' ? 0 : 13, hasMore: scenario !== 'empty' } },
    counts: { status: 'available', data: { pendingResponse: scenario === 'empty' ? 0 : 4, readyToStart: scenario === 'empty' ? 0 : 2, inReview: scenario === 'empty' ? 0 : 7, overdue: scenario === 'empty' ? 0 : 1, definition: 'Server totals across all active cases; closed cases excluded. Paused delivery SLAs are excluded from overdue.' } },
    activity: { status: 'available', data: { events: activityEvents } },
    notifications: { status: 'available', data: { items: notifications, unreadCount: notifications.filter((n) => !n.read).length } },
    performance: { status: 'available', data: { completedThisMonth: scenario === 'empty' ? 0 : 12, completedLastMonth: scenario === 'empty' ? 0 : 9, avgResponseHours: scenario === 'empty' ? 0 : 4.2, avgReviewDays: scenario === 'empty' ? 0 : 2.8, satisfactionScore: scenario === 'empty' ? null : 4.7, onTimeDeliveryRate: scenario === 'empty' ? 0 : 94.5 } },
    analytics: { status: 'available', data: { daily, sourceLabel: 'Illustrative daily history · demo data' } },
  }
}
