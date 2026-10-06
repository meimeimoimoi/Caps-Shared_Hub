export { foldVietnamese, formatDate } from '@/lib/utils'

export const SLA_DAYS = 7
const DAY_MS = 86_400_000

export const waitedDays = (iso: string, now = Date.now()) =>
  Math.floor((now - new Date(iso).getTime()) / DAY_MS)

export const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

