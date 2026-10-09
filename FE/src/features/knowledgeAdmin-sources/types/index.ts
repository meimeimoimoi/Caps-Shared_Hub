import type { Frequency, RUN_TRIGGER, SOURCE_STATUS } from '../constants'

export interface CollectionSchedule {
  frequency: Frequency
  lastRunAt: string | null
  lastRunOk: boolean
  nextRunAt: string
}

export interface CollectionSource {
  id: string
  name: string
  /** Địa chỉ trang để thu thập; null = chưa cấu hình */
  url: string | null
  /** Phạm vi thu thập; null = chưa cấu hình */
  scope: string | null
  status: keyof typeof SOURCE_STATUS
}

export interface CollectionRun {
  at: string
  trigger: keyof typeof RUN_TRIGGER
  /** Người bấm chạy (chỉ có khi chạy thủ công) */
  actor?: string
  newDocs: number
  newVersions: number
  unchanged: number
  /** Số văn bản trích xuất lỗi */
  errors: number
}

/** Dữ liệu form thêm/sửa nguồn */
export type SourceInput = Omit<CollectionSource, 'id'>

/** Toàn bộ dữ liệu màn Nguồn thu thập, lấy trong 1 lần gọi */
export interface CollectionOverview {
  schedule: CollectionSchedule
  sources: CollectionSource[]
  runs: CollectionRun[]
}
