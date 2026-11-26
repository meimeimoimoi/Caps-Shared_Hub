import { useMemo } from 'react'
import { useFormatters } from '@/hooks/useFormatters'
import { i18n } from '@/lib/i18n'
import type { CaseStatus, ReviewCase } from './types'

const TIMEZONE = 'Asia/Ho_Chi_Minh'

/** A key that may have no translation; the app's missing-key handler ignores defaultValue, so callers need a null. */
export const caseText = (key: string, options: object = {}) =>
  i18n.exists(key, { ns: 'reviewCase' })
    ? (i18n.t(key as never, { ns: 'reviewCase', ...options }) as string)
    : null

export const fieldClass =
  'bg-paper border-border-control text-fg-strong placeholder:text-fg-muted rounded-control shadow-control aria-[invalid=true]:border-danger w-full border px-3 py-2.5 text-base transition-[border-color] focus:border-ink'

export function useCaseFormat() {
  const format = useFormatters()
  return useMemo(
    () => ({
      money: (v: number) => format.money(v),
      at: (v: string) =>
        format.timestamp(v, TIMEZONE, {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }),
    }),
    [format]
  )
}

/* Nhóm trạng thái cho danh sách, tổng quan và ví */
export const ACTION_STATUSES: CaseStatus[] = [
  'AWAITING_PAYMENT',
  'AWAITING_USER_INFORMATION',
  'AWAITING_ACCEPTANCE',
]
export const CLOSED_STATUSES: CaseStatus[] = [
  'COMPLETED',
  'RESOLVED',
  'TERMINATED',
  'CANCELLED',
  'CANCELLED_UNPAID',
  'DECLINED_BY_EXPERT',
  'EXPERT_RESPONSE_TIMEOUT',
  'WITHDRAWN',
]
// CANCELLED without a settlement means the client cancelled before paying
const UNPAID: CaseStatus[] = [
  'PENDING_EXPERT_RESPONSE',
  'DECLINED_BY_EXPERT',
  'EXPERT_RESPONSE_TIMEOUT',
  'WITHDRAWN',
  'AWAITING_PAYMENT',
  'CANCELLED_UNPAID',
  'CANCELLED',
]

// In a real case the client pays before the expert answers
const LIVE_UNPAID: CaseStatus[] = ['AWAITING_PAYMENT', 'CANCELLED_UNPAID']

export const fundsOf = (c: ReviewCase) =>
  c.settlement
    ? 'settled'
    : c.dispute
      ? 'locked'
      : (c.live ? LIVE_UNPAID : UNPAID).includes(c.status)
        ? 'none'
        : 'held'

/**
 * Both parties add evidence until the statement window ends; an extension reopens it until the new decision
 * deadline (the API refuses after that). A dispute without the dates (demo data) stays open.
 */
export function evidenceOpen(d: { statementDueBy?: string; decideBy?: string; extended?: boolean }) {
  const until = d.extended ? d.decideBy : d.statementDueBy
  return !until || new Date(until).getTime() > Date.now()
}
