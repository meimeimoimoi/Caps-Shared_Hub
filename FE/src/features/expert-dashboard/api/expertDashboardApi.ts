import { ApiError } from '@/lib/api-client'
import { i18n } from '@/lib/i18n'
import { isExpertDemo } from '@/lib/expert-data-source'
import { listReviewCases } from '@/features/review-case/api/reviewCaseApi'
import { caseTitle } from '@/features/review-case/mapper'
import type { ReviewCaseDto } from '@/features/review-case/types'
import type { ExpertContext } from '@/features/expert-context/types'
import type { ActivityEvent, DashboardDto, PerformanceMetrics, Section, WorkItem, WorkStatus } from '../types'

const WORK_STATUSES: WorkStatus[] = ['PENDING_EXPERT_RESPONSE', 'IN_REVIEW', 'AWAITING_USER_INFORMATION', 'AWAITING_ACCEPTANCE', 'DISPUTED']

function deadlineOf(c: ReviewCaseDto, now: number): WorkItem['deadline'] {
  const paused = c.status === 'AWAITING_USER_INFORMATION'
  const [kind, at, actor]: [string, string | null, 'EXPERT' | 'USER'] =
    c.status === 'PENDING_EXPERT_RESPONSE' ? ['Expert response due', c.responseDeadline, 'EXPERT']
    : c.status === 'IN_REVIEW' ? ['Delivery due', c.deliveryDeadline, 'EXPERT']
    : c.status === 'AWAITING_ACCEPTANCE' ? ['User acceptance due', c.acceptanceDeadline, 'USER']
    : c.status === 'DISPUTED' ? ['Admin decision due', null, 'USER']
    : ['User information due', c.infoRequests?.find((r) => r.status === 'OPEN')?.dueAt ?? null, 'USER']
  return { kind, at, actor, paused, overdue: actor === 'EXPERT' && !!at && Date.parse(at) < now }
}

const DONE = ['COMPLETED', 'AUTO_CONFIRMED', 'RESOLVED']
const HOUR = 3_600_000
const average = (values: number[]) => values.reduce((sum, v) => sum + v, 0) / values.length
// Keys are built from the event kind, so the typed overloads of t cannot check them here
const tr = (key: string, options?: Record<string, unknown>) =>
  (i18n.t as (key: string, options: Record<string, unknown>) => string)(key, { ns: 'reviewCase', ...options })

/**
 * Read from the expert's own cases, so no extra API: response time is payment to acceptance, review time acceptance
 * to delivery, on time is delivered by the (possibly extended) deadline.
 * ponytail: a closed case's updatedAt stands in for its completion time; add completedAt to the DTO if they drift.
 */
function performanceOf(mine: ReviewCaseDto[], now: number): Section<PerformanceMetrics> {
  const delivered = mine.filter((c) => c.acceptedAt && c.deliveredAt)
  if (delivered.length === 0) return { status: 'unavailable', message: tr('live.noDeliveriesYet') }
  const today = new Date(now)
  const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1).getTime()
  const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1).getTime()
  const doneAt = mine.filter((c) => DONE.includes(c.status)).map((c) => Date.parse(c.updatedAt))
  const paid = mine.filter((c) => c.paidAt && c.acceptedAt)
  const rated = mine.filter((c) => c.rating != null)
  return {
    status: 'available',
    data: {
      completedThisMonth: doneAt.filter((t) => t >= thisMonth).length,
      completedLastMonth: doneAt.filter((t) => t >= lastMonth && t < thisMonth).length,
      avgResponseHours: paid.length ? average(paid.map((c) => (Date.parse(c.acceptedAt!) - Date.parse(c.paidAt!)) / HOUR)) : 0,
      avgReviewDays: average(delivered.map((c) => (Date.parse(c.deliveredAt!) - Date.parse(c.acceptedAt!)) / (24 * HOUR))),
      satisfactionScore: rated.length ? average(rated.map((c) => c.rating!)) : null,
      onTimeDeliveryRate:
        (100 * delivered.filter((c) => !c.deliveryDeadline || c.deliveredAt! <= c.deliveryDeadline).length) / delivered.length,
    },
  }
}

/** The latest steps of the expert's cases, newest first, built from the times each case records. */
function activityOf(mine: ReviewCaseDto[]): Section<{ events: ActivityEvent[] }> {
  const events = mine.flatMap((c): ActivityEvent[] => {
    const title = caseTitle(c.problemDescription)
    const event = (type: ActivityEvent['type'], key: string, at: string | null, client: boolean, extra?: Record<string, unknown>) =>
      at ? [{ id: `${c.id}:${key}`, type, title: tr(`live.activity.${key}`, extra), description: title, timestamp: at, caseId: c.id, actor: tr(client ? 'live.activity.client' : 'live.activity.you') }] : []
    return [
      ...event('case_created', 'requested', c.paidAt, true),
      ...event('status_changed', 'accepted', c.acceptedAt, false),
      ...event('status_changed', 'delivered', c.deliveredAt, false),
      ...event('review_submitted', 'rated', c.ratedAt, true, { stars: c.rating }),
      ...(c.status === 'DISPUTED' ? event('dispute_opened', 'disputed', c.updatedAt, true) : []),
      ...(DONE.includes(c.status) ? event('case_completed', 'completed', c.updatedAt, true) : []),
    ]
  })
  events.sort((a, b) => b.timestamp.localeCompare(a.timestamp))
  return { status: 'available', data: { events: events.slice(0, 8) } }
}

/** The expert's active cases, their own deadlines first; the sections with no API yet say so. */
function dashboardFrom(cases: ReviewCaseDto[], context: ExpertContext): DashboardDto {
  const now = Date.now()
  const mine = cases.filter((c) => c.expertProfileId === context.expertId)
  const items = cases
    .filter((c): c is ReviewCaseDto & { status: WorkStatus } => c.expertProfileId === context.expertId && WORK_STATUSES.includes(c.status as WorkStatus))
    .map((c) => ({ c, deadline: deadlineOf(c, now) }))
    // The expert's own steps first, then the client's; soonest deadline first within each
    .sort((a, b) => Number(a.deadline.actor !== 'EXPERT') - Number(b.deadline.actor !== 'EXPERT') || (a.deadline.at ?? '9').localeCompare(b.deadline.at ?? '9'))
    .map(({ c, deadline }, priority): WorkItem => ({
      id: c.id,
      title: caseTitle(c.problemDescription),
      serviceName: context.services.find((s) => s.serviceId === c.serviceCode)?.serviceName ?? c.serviceCode ?? '',
      status: c.status,
      deadline,
      priority,
      nextAction: { code: 'OPEN_CASE', label: 'Open case', actor: deadline.actor },
    }))
  const count = (status: WorkStatus) => items.filter((i) => i.status === status).length
  return {
    generatedAt: new Date(now).toISOString(),
    contextVersion: context.version,
    timezone: 'Asia/Ho_Chi_Minh',
    freshness: { stale: false, message: null },
    queue: { status: 'available', data: { items, total: items.length, hasMore: false } },
    counts: { status: 'available', data: { pendingResponse: count('PENDING_EXPERT_RESPONSE'), inReview: count('IN_REVIEW'), overdue: items.filter((i) => i.deadline.overdue).length, definition: i18n.t('live.openCases', { ns: 'reviewCase' }) } },
    activity: activityOf(mine),
    performance: performanceOf(mine, now),
  }
}

export async function getExpertDashboard(signal: AbortSignal, scenario: string, context?: ExpertContext): Promise<DashboardDto> {
  if (isExpertDemo) {
    if (scenario === 'error') throw new ApiError('The overview could not be loaded. Please retry.', 503)
    const { createDashboardFixture } = await import('./fixtures')
    return createDashboardFixture(scenario)
  }
  if (!context) throw new ApiError('The expert context is not loaded.', 503)
  return dashboardFrom(await listReviewCases(signal), context)
}
