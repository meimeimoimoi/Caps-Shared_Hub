import type { ReviewArticle, UnitStatus } from '../types'

/** Trạng thái cả Điều: có mục cần kiểm tra → WARNING; tất cả đã rà soát → REVIEWED */
export function articleStatus(a: ReviewArticle): UnitStatus {
  if (a.units.some((u) => u.status === 'WARNING')) return 'WARNING'
  if (a.units.every((u) => u.status === 'REVIEWED')) return 'REVIEWED'
  return 'AUTO'
}
