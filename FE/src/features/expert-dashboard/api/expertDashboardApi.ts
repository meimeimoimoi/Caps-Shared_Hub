import { ApiError } from '@/lib/api-client'
import { i18n } from '@/lib/i18n'
import { isExpertDemo } from '@/lib/expert-data-source'
import { listReviewCases } from '@/features/review-case/api/reviewCaseApi'
import { caseTitle } from '@/features/review-case/mapper'
import type { ReviewCaseDto } from '@/features/review-case/types'
import type { ExpertContext } from '@/features/expert-context/types'
import type { DashboardDto, Section, WorkItem, WorkStatus } from '../types'

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

/** The expert's active cases, their own deadlines first; the sections with no API yet say so. */
function dashboardFrom(cases: ReviewCaseDto[], context: ExpertContext): DashboardDto {
  const now = Date.now()
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
  const notConnected: Section<never> = { status: 'unavailable', message: i18n.t('live.notConnected', { ns: 'reviewCase' }) }
  return {
    generatedAt: new Date(now).toISOString(),
    contextVersion: context.version,
    timezone: 'Asia/Ho_Chi_Minh',
    freshness: { stale: false, message: null },
    queue: { status: 'available', data: { items, total: items.length, hasMore: false } },
    counts: { status: 'available', data: { pendingResponse: count('PENDING_EXPERT_RESPONSE'), readyToStart: null, inReview: count('IN_REVIEW'), overdue: items.filter((i) => i.deadline.overdue).length, definition: i18n.t('live.openCases', { ns: 'reviewCase' }) } },
    activity: notConnected,
    notifications: notConnected,
    performance: notConnected,
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
