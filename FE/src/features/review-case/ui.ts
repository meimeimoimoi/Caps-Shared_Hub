import { useMemo } from 'react'
import { useFormatters } from '@/hooks/useFormatters'
import type { CaseStatus, ReviewCase } from './types'

const TIMEZONE = 'Asia/Ho_Chi_Minh'

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

export const fundsOf = (c: ReviewCase) =>
  c.settlement
    ? 'settled'
    : c.dispute
      ? 'locked'
      : UNPAID.includes(c.status)
        ? 'none'
        : 'held'
