import { DISPUTE_SLA_HOURS } from '../constants'

/** Số giờ còn lại trước hạn trọng tài (không âm) */
export const disputeHoursLeft = (openedAt: string, now: number) =>
  Math.max(0, DISPUTE_SLA_HOURS - Math.floor((now - new Date(openedAt).getTime()) / 3_600_000))
