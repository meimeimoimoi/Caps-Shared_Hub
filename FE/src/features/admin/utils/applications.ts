export const SLA_DAYS = 7
const DAY_MS = 86_400_000

/** Bỏ dấu tiếng Việt + lowercase để tìm kiếm "nguyen" khớp "Nguyễn". */
export const foldVietnamese = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd').toLowerCase()

export const waitedDays = (iso: string, now = Date.now()) =>
  Math.floor((now - new Date(iso).getTime()) / DAY_MS)

export const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
