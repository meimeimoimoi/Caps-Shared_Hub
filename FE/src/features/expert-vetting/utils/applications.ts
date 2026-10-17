export { foldVietnamese, formatDate, formatDateTime } from '@/lib/utils'

export const SLA_DAYS = 7
const DAY_MS = 86_400_000

export const waitedDays = (iso: string, now = Date.now()) =>
  Math.floor((now - new Date(iso).getTime()) / DAY_MS)
