export type WorkStatus = 'PENDING_EXPERT_RESPONSE' | 'PAYMENT_CONFIRMED' | 'IN_REVIEW' | 'AWAITING_USER_INFORMATION' | 'AWAITING_ACCEPTANCE' | 'DISPUTED'
export interface WorkItem {
  id: string
  title: string
  serviceName: string
  status: WorkStatus
  deadline: { kind: string; at: string | null; actor: 'EXPERT' | 'USER'; paused: boolean; overdue: boolean }
  priority: number
  nextAction: { code: string; label: string; actor: 'EXPERT' | 'USER' } | null
}
export type Section<T> =
  | { status: 'available'; data: T }
  | { status: 'error' | 'unavailable'; message: string }

export type ActivityType = 'case_created' | 'case_completed' | 'payment_received' | 'review_submitted' | 'status_changed' | 'deadline_extended' | 'dispute_opened' | 'pricing_approved'
export interface ActivityEvent {
  id: string
  type: ActivityType
  title: string
  description: string
  timestamp: string
  caseId: string | null
  actor: string
}

export type NotificationSeverity = 'info' | 'warning' | 'success' | 'urgent'
export interface DashboardNotification {
  id: string
  severity: NotificationSeverity
  title: string
  message: string
  timestamp: string
  read: boolean
  actionUrl: string | null
}

export interface PerformanceMetrics {
  completedThisMonth: number
  completedLastMonth: number
  avgResponseHours: number
  avgReviewDays: number
  satisfactionScore: number | null
  onTimeDeliveryRate: number
}

export interface ReviewTrendPoint {
  date: string
  received: number
  completed: number
}

export interface ReviewAnalytics {
  daily: ReviewTrendPoint[]
  sourceLabel: string
}

export interface DashboardDto {
  generatedAt: string
  contextVersion: string
  timezone: string
  freshness: { stale: boolean; message: string | null }
  queue: Section<{ items: WorkItem[]; total: number; hasMore: boolean }>
  counts: Section<{ pendingResponse: number; readyToStart: number; inReview: number; overdue: number; definition: string }>
  activity: Section<{ events: ActivityEvent[] }>
  notifications: Section<{ items: DashboardNotification[]; unreadCount: number }>
  performance: Section<PerformanceMetrics>
  analytics?: Section<ReviewAnalytics>
}
